import { HyperUID } from '../types';
import { HyperApp, HyperWindow } from './hyper';
import WindowCtrl from './window';
import { app } from 'electron';

const windows: Record<HyperUID, WindowCtrl> = {};

export function onWindow(window: HyperWindow) {
  const uid = window.uid;
  if (!windows[uid]) {
    windows[uid] = new WindowCtrl(app as unknown as HyperApp, window);
    window.tmuxify = (hyperCtrlSession) => windows[uid].initTmux(hyperCtrlSession);
  }
}

export function decorateSessionClass(Session: any) {
  return function(options: any) {
    if (options.hyperWindowUID && windows[options.hyperWindowUID]) {
      return windows[options.hyperWindowUID].createControlledSession(options);
    } else {
      return new Session(options);
    }
  }
}