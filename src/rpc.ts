import { HyperUID, TmuxID, TmuxLayout, TmuxSplitDirection } from "./types";

export const TM_START = "tmux:start";
export const TM_PANE_CHANGED = "tmux:change:pane";
export const TM_WINDOW_CHANGED = "tmux:change:window";
export const TM_SYNC_LAYOUT = "tmux:sync";
export const TM_REQUEST_SYNC = "tmux:request:sync";
export const TM_REQUEST_SESSION = "tmux:request:session";
export const TM_RESIZE = "tmux:resize";

export interface TmuxStartMessage {
  sessionUID: HyperUID;
  initialControlData: string;
}

export interface ActiveSessionChangedMessage {
  sessionUID: HyperUID;
}

export interface ActiveWindowChangedMessage {
  windowID: TmuxID;
}

export interface SyncLayoutMessage extends TmuxLayout {}

export interface RequestSessionMessage {
  paneID: TmuxID;
  hyperWindowUID: HyperUID;
  splitDirection?: TmuxSplitDirection;
}

export interface ResizeMessage {
  sessionUID: HyperUID;
  paneCols: number;
  paneRows: number;
  windowCols: number | null;
  windowRows: number | null;
}

export interface RendererRPC {
  emit(event: typeof TM_START, args: TmuxStartMessage): boolean;
  emit(event: typeof TM_PANE_CHANGED, args: ActiveSessionChangedMessage): boolean;
  emit(event: typeof TM_REQUEST_SYNC): boolean;
  emit(event: typeof TM_WINDOW_CHANGED, args: ActiveWindowChangedMessage): boolean;
  emit(event: typeof TM_RESIZE, args: ResizeMessage): boolean;
  emit(event: 'new', args: any): boolean;

  on(event: typeof TM_PANE_CHANGED, listener: (args: ActiveSessionChangedMessage) => void): this;
  on(event: typeof TM_SYNC_LAYOUT, listener: (args: SyncLayoutMessage) => void): this
  on(event: typeof TM_REQUEST_SESSION, listener: (args: RequestSessionMessage) => void): this
  // on(event: typeof TM_WINDOW_CHANGED, listener: (args: ActiveWindowChangedMessage) => void): this
}

export interface AppRPC {
  emit(event: typeof TM_SYNC_LAYOUT, args: SyncLayoutMessage): boolean;
  emit(event: typeof TM_REQUEST_SESSION, args: RequestSessionMessage): boolean;
  emit(event: typeof TM_PANE_CHANGED, args: ActiveSessionChangedMessage): boolean;

  on(event: typeof TM_PANE_CHANGED, listener: (args: ActiveSessionChangedMessage) => void): this;
  on(event: typeof TM_START, listener: (args: TmuxStartMessage) => void): this;
  on(event: typeof TM_REQUEST_SYNC, listener: () => void): this;
  on(event: typeof TM_WINDOW_CHANGED, listener: (args: ActiveWindowChangedMessage) => void): this;
  on(event: typeof TM_RESIZE, listener: (args: ResizeMessage) => void): this;
}