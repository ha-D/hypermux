import { debounce } from 'lodash';
import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from "redux";
import { RendererRPC, TM_PANE_CHANGED, TM_RESIZE, TM_SPLIT, TM_START, TM_WINDOW_CHANGED } from '../rpc';
import { HyperUID } from '../types';
import EventBlocker from '../utils/blocker';
import { HyperState, HyperTermGroup } from './hyper';
import { getRPC } from "./rpc";
import { getTmuxWindowFromTermGroup } from './utils';


type Params = {
  action: any,
  store: MiddlewareAPI<Dispatch<AnyAction>, any>,
  rpc: RendererRPC
}

const preHandlers: Record<string, (params: Params) => any> = {
  'SESSION_PTY_DATA': onPtyData,
  'SESSION_SET_ACTIVE': ({action, rpc}) => rpc.emit(TM_PANE_CHANGED, { sessionUID: action.uid }),
  'CHANGE_TAB': ({action, rpc}) => rpc.emit(TM_WINDOW_CHANGED, {windowID: getTmuxWindowFromTermGroup(action.uid)!}),
  'UI_COMMAND_EXEC': onUICommand,
};

const postHandlers: Record<string, (params: Params) => any> = {
  'SESSION_RESIZE': debounce(onResize, 500, { 'maxWait': 5000 }),
}

export const blocker: EventBlocker = new EventBlocker();

const CANCEL = "cancel";


export const middleware: Middleware = (store) => (next) => (action) => {
  const rpc = getRPC(store.dispatch);

  console.log("---", action.type, action)
  if (action.bypassCC || blocker.isBlocked(action.type)) {
    return next(action);
  }

  if (action.type in preHandlers) {
    const nextAction = preHandlers[action.type]({action, store, rpc});
    if (typeof(nextAction) === 'object') {
      next(nextAction);
    } else if (nextAction !== CANCEL) {
      next(action);
    }
  } else {
    next(action);
  }

  if (action.type in postHandlers) {
    postHandlers[action.type]({action, store, rpc});
  }
};

const ccInitiatorSessions: Set<HyperUID> = new Set();

function onPtyData({action, rpc}: Params) {
  if (ccInitiatorSessions.has(action.uid)) {
    return CANCEL;
  } else if (hasEnteredControlMode(action.data)) {
    ccInitiatorSessions.add(action.uid)
    rpc.emit(TM_START, { sessionUID: action.uid, initialControlData: action.data });
    return { ...action, data: "** tmux mode started **" };
  }
  return action;
}

function hasEnteredControlMode(data: string): boolean {
  return !!data && data.startsWith('\x1bP1000p');
}

function onResize({store, rpc, action}: Params) {
  const {sessions, termGroups} : HyperState = store.getState();

  const getTermGroupSize = (tg: HyperTermGroup): {rows: number, cols: number} => {
    if (tg.sessionUid) {
      const session = sessions.sessions[tg.sessionUid];
      return {rows: session?.rows || 0, cols: session?.cols || 0};
    } else {
      let [rows, cols] = [0, 0];
      for (const childUID of tg.children) {
        const childSize = getTermGroupSize(termGroups.termGroups[childUID]);
        if (tg.direction === 'HORIZONTAL') {
          rows += childSize.rows;
          cols = childSize.cols;
        } else if (tg.direction === 'VERTICAL') {
          rows = childSize.rows;
          cols += childSize.cols;
        }
      }
      return {rows, cols};
    }
  };

  let [windowRows, windowCols]: (number | null)[] = [null, null];
  if (termGroups.activeRootGroup != null) {
    const activeRootGroup = termGroups.termGroups[termGroups.activeRootGroup];
    const windowSize = getTermGroupSize(activeRootGroup);
    windowRows = windowSize.rows;
    windowCols = windowSize.cols;
  }
  
  rpc.emit(TM_RESIZE, {sessionUID: action.uid, paneRows: action.rows, paneCols: action.cols, windowRows, windowCols})
}

function onUICommand({action, rpc, store}: Params) {
  const {sessions} : HyperState = store.getState();

  switch(action.command) {
    case 'pane:splitRight':
      rpc.emit(TM_SPLIT, {direction: "HORIZONTAL", session: sessions.activeUid})
      return CANCEL
    case 'pane:splitDown':
      rpc.emit(TM_SPLIT, {direction: "VERTICAL", session: sessions.activeUid})
      return CANCEL
  }

  return;
}