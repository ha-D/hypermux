import { HyperUID, TmuxConsolePane, TmuxID, TmuxPane, TmuxPanes, TmuxSplitDirection, TmuxWindow } from '../types';
import { AppRPC, TmuxStartMessage, TM_REQUEST_SESSION, TM_REQUEST_SYNC, TM_PANE_CHANGED, TM_START, TM_SYNC_LAYOUT, TM_WINDOW_CHANGED, TM_RESIZE, ResizeMessage } from '../rpc';
import { HyperApp, HyperSession, HyperWindow } from './hyper';
import ControlledSession from './session';
import TmuxCtrl from './tmux';
import {sleep} from '../utils';
import EventBlocker from '../utils/blocker';


export default class WindowCtrl {
  hyperApp: HyperApp;
  hyperWindow: HyperWindow;
  hyperCtrlSession?: HyperSession;
  rpc: AppRPC;

  hyperSessions: Record<HyperUID, ControlledSession> = {};
  pane2HyperSession: Record<TmuxID, HyperUID> = {};

  windows: TmuxWindow[] = [];
  panes: TmuxPanes = {};

  sessionRequests: Record<TmuxID, () => void> = {};
  tmuxCtrl?: TmuxCtrl;

  blocker: EventBlocker = new EventBlocker();

  constructor(app: HyperApp, window: HyperWindow) {
    this.hyperApp = app;
    this.hyperWindow = window;
    this.rpc = window.rpc;
    this.init();
  }

  init() {
    this.rpc.on(TM_START, ({sessionUID}: TmuxStartMessage) => {
      console.log('New tmux session started for', sessionUID);
      this.hyperApp.createWindow((win) => win.tmuxify(this.hyperWindow.sessions.get(sessionUID)));
    });
  }
  
  initTmux(hyperCtrlSession: HyperSession) {
    // this.rpc.removeAllListeners('tmux:session:start');
    // this.rpc.removeAllListeners('tmux:control:data');

    
    this.hyperCtrlSession = hyperCtrlSession;
    this.tmuxCtrl = new TmuxCtrl(hyperCtrlSession.pty);

    this.hyperCtrlSession.emit('exit');
    this.hyperCtrlSession.removeAllListeners();
    this.hyperCtrlSession.on('data', (data) => this.tmuxCtrl?.data(data.slice(36)));

    const bl = this.blocker;
    this.rpc.on(TM_REQUEST_SYNC, () => !bl.isBlocked(TM_REQUEST_SYNC) && this.syncPanes());
    this.rpc.on(TM_PANE_CHANGED, ({sessionUID}) => !bl.isBlocked(TM_PANE_CHANGED) && this.hyperSessions[sessionUID].setActive());
    this.rpc.on(TM_WINDOW_CHANGED, ({windowID}) => !bl.isBlocked(TM_WINDOW_CHANGED) && this.tmuxCtrl?.command(`select-window -t @${windowID}`));
    this.rpc.on(TM_RESIZE, (args) => !bl.isBlocked(TM_RESIZE) && this.onHyperResized(args));

    this.onTmuxEvent('window-pane-changed', (_: any, paneID: TmuxID) => this.rpc.emit(TM_PANE_CHANGED, {sessionUID: this.pane2HyperSession[paneID]}));
    this.onTmuxEvent('session-window-changed', (windowID: TmuxID) => this.onTmuxWindowChanged(windowID));
    this.onTmuxEvent('layout-change', () => this.syncPanes());
    this.syncPanes();
  }

  onTmuxEvent(event: string, handler: Function) {
    this.tmuxCtrl?.on(event, (...args) => !this.blocker.isBlocked(event) && handler(...args));
  }

  createControlledSession({uid, paneID}: {uid: string, paneID: TmuxID}) {
    this.pane2HyperSession[paneID] = uid;
    if (this.sessionRequests[paneID]) {
      this.sessionRequests[paneID]();
      delete this.sessionRequests[paneID];
    }
    const session = new ControlledSession(this.tmuxCtrl!, paneID, uid);
    this.hyperSessions[uid] = session;
    return session;
  }

  requestControlledSession(paneID: TmuxID, splitDirection?: TmuxSplitDirection) {
    return new Promise((resolve) => {
      this.sessionRequests[paneID] = resolve;
      this.rpc.emit(TM_REQUEST_SESSION, {paneID: paneID, hyperWindowUID: this.hyperWindow.uid, splitDirection});
    });    
  }

  findActivePane(windowID: TmuxID, pane?: TmuxPane): TmuxConsolePane | null {
    if (pane === undefined) {
      pane = this.windows[windowID]?.pane;
      if (pane === undefined) {
        return null;
      }
    }

    if ('panes' in pane) {
      for (const child of pane.panes) {
        const activePane = this.findActivePane(windowID, child);
        if (activePane) {
          return activePane;
        }
      }
    } else if (pane.active) {
      return pane;
    }
    return null;
  }

  async syncPanes() {
    this.blocker.blockEvent(TM_RESIZE, {count: 1, time: 2000})

    const panes = await this.tmuxCtrl!.getPanes();
    const windows = await this.tmuxCtrl!.getWindows(panes);
    for (const sid in panes) {
      const id = parseInt(sid) as TmuxID;
      if (!this.pane2HyperSession[id]) {
         await this.requestControlledSession(id, panes[sid].parentDirection);
      }
    }
    this.panes = panes;
    this.windows = windows;
    this.rpc.emit(TM_SYNC_LAYOUT, {panes, windows, paneToHyperUID: this.pane2HyperSession});
  }

  async onHyperResized({sessionUID, paneCols, paneRows, windowCols, windowRows}: ResizeMessage) {
    const unblock = this.blocker.blockEvent('layout-change');
    if (windowCols && windowRows) {
      const {rows, cols} = await this.tmuxCtrl!.getWindowSize();
      if (rows != windowRows || cols != windowCols) {
        await this.tmuxCtrl!.resizeWindow({rows: windowRows, cols: windowCols});
      }
    }

    const session = this.hyperSessions[sessionUID];
    if (session !== undefined) {
      await this.tmuxCtrl?.resizePane(session.tmuxPaneID, {rows: paneRows, cols: paneCols});
    }

    await sleep(500);
    unblock();
  }

  async onTmuxWindowChanged(windowID: TmuxID) {
    const activePane = this.findActivePane(windowID);
    if (activePane != null) {
      this.rpc.emit(TM_PANE_CHANGED, {sessionUID: this.pane2HyperSession[activePane.id]})
    }
  }
}
