import { find, pick, reduce } from 'lodash';
import Immutable, { Immutable as ImmutableType } from 'seamless-immutable';
import { HyperUID, TmuxPane } from '../types';
import { HyperSession, HyperSessionState, HyperTermGroup, HyperTermState, HyperUIState } from './hyper';
import { TmuxAction, TmuxSyncLayoutAction, TMUX_SYNC_LAYOUT } from './types';
import { getTermGroupFromPane } from './utils';


export function reduceUI(state: ImmutableType<HyperUIState>, action: TmuxAction) {
  console.log("UIU", state)
  switch (action.type) {
    case TMUX_SYNC_LAYOUT:
      return state.merge({
        rows: action.layout.windows[0].rows,
        cols: action.layout.windows[0].cols
      });
  }
  return state;
}

export function reduceSessions(state: ImmutableType<HyperSessionState>, action: TmuxAction) {
  console.log("SES", state)
  switch (action.type) {
    case TMUX_SYNC_LAYOUT:
      return state.merge(createSessionStateFromLayout(action));
  }
  return state;
}

function createSessionStateFromLayout({ layout: { panes, paneToHyperUID }}: TmuxSyncLayoutAction): HyperSessionState {
  const sessions = reduce(panes, (sessions: Record<HyperUID, ImmutableType<HyperSession>>, pane) => {
    const uid = paneToHyperUID[pane.id];
    sessions[uid] = Immutable({
      uid,
      ...pick(pane, ['title', 'cols', 'rows', 'pid']),
      cleared: false,
      search: false,
      shell: '',
      url: '',
    });
    return sessions;
  }, {});
  const activePane = find(panes, (p) => p.active);
  const activeUid = activePane ? paneToHyperUID[activePane.id] : '';
  return { sessions, activeUid };
}


export function reduceTermGroups(state: ImmutableType<HyperTermState>, action: TmuxAction) {
  console.log("TER", state)
  switch (action.type) {
    case TMUX_SYNC_LAYOUT:
      return state.merge(createTermGroupStateFromLayout(action));
  }
  return state;
}


function createTermGroupStateFromLayout({ layout: { windows, paneToHyperUID } }: TmuxSyncLayoutAction): HyperTermState {
  let activeRootGroup = null;
  // const activeTermGroup = getTermGroupUID(windows[0].id, 0);
  const activeSessions: Record<HyperUID, HyperUID> = {};
  const termGroups = windows.reduce((termGroups: Record<HyperUID, HyperTermGroup>, window) => {
    let counter = 0;
    const dfs = (group: TmuxPane, parent: HyperUID | null) => {
      const tgID = getTermGroupFromPane(window.id, counter++);
      if ('id' in group) {
        termGroups[tgID] = {
          sessionUid: paneToHyperUID[group.id],
          parentUid: parent,
          uid: tgID,
          children: [],
          direction: null,
          sizes: null,
        }
        if (group.active) {
          activeSessions[getTermGroupFromPane(window.id, 0)] = paneToHyperUID[group.id];
        }
      } else {
        termGroups[tgID] = {
          sessionUid: "",
          parentUid: parent,
          uid: tgID,
          direction: group.direction,
          children: group.panes.map(p => dfs(p, tgID)),
          sizes: group.panes.map(p => group.direction === 'VERTICAL' ? (p.cols / group.cols) : (p.rows / group.rows)),
        };
      }
      return tgID;
    }
    dfs(window.pane, null);

    if (window.active) {
      activeRootGroup = getTermGroupFromPane(window.id, 0);
    }
    return termGroups;
  }, {});

  return {termGroups, activeSessions, activeRootGroup}
}