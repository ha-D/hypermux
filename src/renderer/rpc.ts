import { Dispatch } from 'react';
import { RendererRPC, SyncLayoutMessage, TM_REQUEST_SESSION, TM_PANE_CHANGED, TM_SYNC_LAYOUT } from '../rpc';
import { syncLayout } from './actions';
import { HYPER_SESSION_SET_ACTIVE } from './hyper';

let initialized = false;


export function getRPC(dispatch: Dispatch<any>): RendererRPC {
  // @ts-ignore
  const rpc: RPC = window.rpc;
  if (!initialized) {
    initRPC(rpc, dispatch);
    initialized = true;
  }
  return rpc;
}

function initRPC(rpc: RendererRPC, dispatch: Dispatch<any>) {
  rpc.on(TM_SYNC_LAYOUT, (layout: SyncLayoutMessage) => dispatch(syncLayout(layout)))
  rpc.on(TM_REQUEST_SESSION, ({paneID, hyperWindowUID, splitDirection}) => rpc.emit('new', {paneID, hyperWindowUID, activeUid: paneID, splitDirection}))
  rpc.on(TM_PANE_CHANGED, ({sessionUID}) => dispatch({type: HYPER_SESSION_SET_ACTIVE, uid: sessionUID, bypassCC: true}))
  // rpc.on(TM_WINDOW_CHANGED, ({windowID}) => dispatch({type: HYPER_CHANGE_TAB, uid: `tmux-win-${windowID}-group-0`, bypassCC: true}))
}
