import { TmuxLayout } from '../types';
import { blocker } from './middleware';
import { TmuxDispatch, TMUX_SYNC_LAYOUT } from './types';

export function syncLayout(layout: TmuxLayout) {
  return (dispatch: TmuxDispatch) => {
    dispatch({
      type: TMUX_SYNC_LAYOUT,
      layout,
      effect() {
        blocker.blockEvent('SESSION_RESIZE', {count: 1, time: 1000});
      }
    });
  };
}
