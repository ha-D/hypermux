export type TmuxID = number;
export type HyperUID = string;

export type TmuxWindow = {
  id: TmuxID,
  cols: number,
  rows: number,
  name: string,
  active: boolean,
  pane: TmuxPane
}

export type TmuxSplitDirection = 'VERTICAL' | 'HORIZONTAL';

export type TmuxConsolePane = {
  id: TmuxID,
  parentDirection?: TmuxSplitDirection,
  cols: number,
  rows: number,
  title: string,
  pid: number | null,
  tty?: string,
  active: boolean,
  cursorX: number,
  cursorY: number
}

export type TmuxSplitPane = {
  parentDirection?: TmuxSplitDirection,
  direction: TmuxSplitDirection,
  cols: number,
  rows: number,
  panes: TmuxPane[]
}

export type TmuxPane = TmuxConsolePane | TmuxSplitPane
export type TmuxPanes = Record<TmuxID, TmuxConsolePane>

export interface TmuxLayout {
  windows: TmuxWindow[];
  panes: TmuxPanes;
  paneToHyperUID: Record<TmuxID, HyperUID>;
}