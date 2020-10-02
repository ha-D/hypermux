import { EventEmitter } from "events";
import { IPty } from "./hyper";
import Queue from "../utils/queue";
import Scanner from "../utils/scanner";
import { TmuxID, TmuxPane, TmuxPanes, TmuxSplitDirection, TmuxWindow } from "../types";
import { keyBy } from "lodash";

type PromiseResolver = {resolve: (arg: string[]) => void, reject: (arg: string[]) => void};
type OutputReceiver = (arg: string) => void;
type CommandHandler = (scanner: Scanner) => void;

export default class TmuxCtrl extends EventEmitter {
  pty: IPty
  inBlock: boolean = false
  buffer: string[] = []
  cmdPromise: Queue<PromiseResolver> = new Queue(20);
  outputReceivers: Record<TmuxID, OutputReceiver> = {}

  handlers: Record<string, CommandHandler> = {
    '%window-add': (scanner) => this.emit('window-add', scanner.readWord().slice(1)),
    '%output': (scanner) => (this.outputReceivers[scanner.skip(1).readNumber()] || (()=>{}))(this.unescape(scanner.readAll())),
    '%window-pane-changed': (scanner) => this.emit('window-pane-changed', scanner.skip(1).readNumber(), scanner.skip(1).readNumber()),
    '%session-window-changed': (scanner) => this.emit('session-window-changed', scanner.skipWord().skip(1).readNumber()),
    '%layout-change': () => this.emit('layout-change'),
  }

  constructor(pty: IPty) {
    super();
    this.pty = pty;
  }
  
  unescape(data: string) {
    return data.replace(/\\(\d{3})/g, (_, val) => String.fromCharCode(parseInt(val, 8)));
  }

  data (data: string) {
    data.split('\r\n').forEach(l => this.dataLine(l));
  }

  dataLine (data: string) {
    if (this.inBlock && !data.startsWith('%end') && !data.startsWith('%error')) {
      this.buffer.push(data);
      return;
    }

    const scanner = new Scanner(data);
    let command = scanner.readWord();

    if (command.startsWith('\x1bP1000p')) {
      command = command.slice('\x1bP1000p'.length)
    }

    if (!this.inBlock && command === '%begin') {
      this.inBlock = true;
      this.buffer = [];
      return;
    } else if (this.inBlock && (command === '%end' || command === '%error')) {
      this.inBlock = false;
      const promise = this.cmdPromise.get()
      if (promise) {
        if (command === '%end') {
          promise.resolve(this.buffer);
        } else {
          promise.reject(this.buffer);
        }
      }
      return;
    }

    const handler = this.handlers[command];
    if (handler) {
      handler.call(this, scanner);
    }
  }

  registerOutputReceiver(id: TmuxID, receiver: OutputReceiver) {
    this.outputReceivers[id] = receiver;
  }

  command(cmd: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.cmdPromise.put({resolve, reject});
      this.write(cmd);
    })
    .catch(e => {
      console.error(e);
      throw e;
    }) as Promise<string[]>;
  }

  write(data: string, newline:boolean=true) {
    this.pty.write(data);
    if (newline) {
      this.pty.write('\n');
    }
  }

  send(data: string) {
    return this.command(`send -l "${data}"`)
  }

  sendSpecial(data: string) {
    return this.command(`send ${data}`)
  }

  selectPane(paneID: TmuxID) {
    return this.command(`select-pane -t %${paneID}`);
  }

  resizeWindow({rows, cols}: {rows: number, cols: number}) {
    return this.command(`resize-window -x ${cols} -y ${rows}`);
  }

  resizePane(paneID: TmuxID, {rows, cols}: {rows: number, cols: number}) {
    return this.command(`resize-pane -t ${paneID} -x ${cols} -y ${rows}`);
  }

  async getWindowSize(): Promise<{rows: number, cols: number}> {
    const resp = await this.command('list-windows -F "#{window_height} #{window_width}"');
    const [rows, cols] = resp[0].split(' ').map(r => parseInt(r));
    return {rows, cols};
  }

  getPanes(): Promise<TmuxPanes> {
    const re = /[%](.+) (.+) (.+) "(.+)" (.+) (.+) (.+) (.+) (.+)/;
    return this.command(`lsp -sF '#{pane_id} #{pane_width} #{pane_height} "#{pane_title}" #{pane_pid} #{pane_tty} #{pane_active} #{cursor_x} #{cursor_y}'`)
    .then((result: string[]) => result.map(l => re.exec(l.trim())))
    .then(r => (r.filter(p => p != null) as RegExpExecArray[]))
    .then(result => result.map(p => ({id: parseInt(p[1]), cols: parseInt(p[2]), rows: parseInt(p[3]), title: p[4], 
      pid: parseInt(p[5]), tty: p[6], active: p[7] === '1', cursorX: parseInt(p[8]), cursorY: parseInt(p[9])})))
    .then(result => keyBy(result, 'id'))
  }

  async getWindows(panes: TmuxPanes): Promise<TmuxWindow[]> {
    if (!panes) {
      panes = await this.getPanes();
    }
    const re = /[@](.+) (.+) (.+) (.+) "(.+)" (.+)/;
    return this.command(`list-windows -F '#{window_id} #{window_layout} #{window_width} #{window_height} "#{window_name}" #{window_active}'`)
      .then((r: string[]) => r.map(l => re.exec(l.trim())))
      .then(r => (r.filter(p => p != null) as RegExpExecArray[]))
      .then(r => r.map(p => ({id: parseInt(p[1]), pane: this.parseWindowLayout(p[2], panes), cols: parseInt(p[3]), rows: parseInt(p[4]), name: p[5], active: p[6] === '1'})))
  }

  parseWindowLayout(raw: string, panes: TmuxPanes): TmuxPane {
    const scanner = new Scanner(raw);
    
    const parseContainer: ((dir?: TmuxSplitDirection) => TmuxPane[]) = (dir?: TmuxSplitDirection) => {
      const cols = scanner.readNumber();
      scanner.expect('x');
      const rows = scanner.readNumber();
      scanner.expect(',').expectNumber().expect(',').expectNumber();

      let result: TmuxPane;
      switch(scanner.take(1)) {
        case ',':
          result = panes[scanner.readNumber()];
          break;
        case '[':
          result = { direction: 'HORIZONTAL' as const, panes: parseContainer('HORIZONTAL'), cols, rows };
          scanner.expect(']');
          break;
        case '{':
          result = { direction: 'VERTICAL' as const, panes: parseContainer('VERTICAL'), cols, rows };
          scanner.expect('}');
          break;
        default:
          throw `Scan error: unexpected value ${scanner.peekAt()}`
      }

      if (dir) {
        result.parentDirection = dir;
      }

      if (scanner.peekAt() === ',') {
        scanner.take(1);
        return [result].concat(parseContainer(dir));
      }

      return [result];
    }

    try {
      scanner.skip(5);
      let result = parseContainer();
      if (result.length !== 1) {
        throw `Scan error: TODO`; // TODO:
      }
      return result[0];
    } catch(e) {
      console.error(e);
      throw e;
    }
  }
}
