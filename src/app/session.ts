import { EventEmitter } from "events";
import { HyperUID, TmuxID } from "../types";
import TmuxCtrl from "./tmux";

export default class ControlledSession extends EventEmitter {
  tmuxCtrl: TmuxCtrl
  tmuxPaneID: TmuxID
  hyperSessionUID: HyperUID
  ended: boolean = false

  constructor(tmuxCtrl: TmuxCtrl, tmuxPaneID: TmuxID, hyperSessionUID: HyperUID) {
    super();
    this.tmuxCtrl = tmuxCtrl;
    this.tmuxPaneID = tmuxPaneID;
    this.hyperSessionUID = hyperSessionUID;

    console.log('New controlled session', tmuxPaneID, hyperSessionUID)
    tmuxCtrl.registerOutputReceiver(tmuxPaneID, (data) => this.emit('data', `${this.hyperSessionUID}${data}`));
  }

  exit(): void {
    this.destroy();
  }

  write(data: string): void {
    // TODO: needs fixing the case where enter is given with other data
    if (data === '\r') {
      this.tmuxCtrl.sendSpecial('Enter');
    } else {
      this.tmuxCtrl.send(data);
    }
  }

  resize(_: {cols: number, rows: number}): void {
  }

  destroy(): void {
    console.log('Session destroyed');
    this.emit('exit');
    this.ended = true;
  }

  setActive(): void {
    this.tmuxCtrl.selectPane(this.tmuxPaneID);
  }
}
