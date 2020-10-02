import { Dispatch } from 'react';
import { TmuxLayout } from '../types';

export const TMUX_SYNC_LAYOUT = 'TMUX_SYNC_LAYOUT';

export interface TmuxSyncLayoutAction {
  type: typeof TMUX_SYNC_LAYOUT;
  layout: TmuxLayout;
  effect: () => void;
}

export type TmuxAction =
  | TmuxSyncLayoutAction

// export type TmuxThinkDispatch = ThunkDispatch<HyperState, undefined, HyperActions>;
export type TmuxDispatch = Dispatch<TmuxAction>