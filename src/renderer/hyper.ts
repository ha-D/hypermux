export const HYPER_SESSION_PTY_DATA = 'SESSION_PTY_DATA';
export const HYPER_SESSION_SET_ACTIVE = 'SESSION_SET_ACTIVE';
export const HYPER_CHANGE_TAB = 'CHANGE_TAB';

export type HyperTermGroup = {
  uid: string;
  sessionUid: string | null;
  parentUid: string | null;
  direction: 'HORIZONTAL' | 'VERTICAL' | null;
  sizes: number[] | null;
  children: string[];
};

export type HyperTermGroups = Record<string, HyperTermGroup>;

export type HyperTermState = {
  termGroups: HyperTermGroups;
  activeSessions: Record<string, string>;
  activeRootGroup: string | null;
};

export type cursorShapes = 'BEAM' | 'UNDERLINE' | 'BLOCK';
import {FontWeight} from 'xterm';

export type HyperUIState = {
  _lastUpdate: number | null;
  activeUid: string | null;
  activityMarkers: Record<string, boolean>;
  backgroundColor: string;
  bell: string;
  bellSoundURL: string | null;
  bellSound: string | null;
  borderColor: string;
  colors: {
    black: string;
    blue: string;
    cyan: string;
    green: string;
    lightBlack: string;
    lightBlue: string;
    lightCyan: string;
    lightGreen: string;
    lightMagenta: string;
    lightRed: string;
    lightWhite: string;
    lightYellow: string;
    magenta: string;
    red: string;
    white: string;
    yellow: string;
  };
  cols: number | null;
  copyOnSelect: boolean;
  css: string;
  cursorAccentColor: string;
  cursorBlink: boolean;
  cursorColor: string;
  cursorShape: cursorShapes;
  cwd?: string;
  disableLigatures: boolean;
  fontFamily: string;
  fontSize: number;
  fontSizeOverride: null | number;
  fontSmoothingOverride: string;
  fontWeight: FontWeight;
  fontWeightBold: FontWeight;
  foregroundColor: string;
  fullScreen: boolean;
  letterSpacing: number;
  lineHeight: number;
  macOptionSelectionMode: string;
  maximized: boolean;
  messageDismissable: null | boolean;
  messageText: string | null;
  messageURL: string | null;
  modifierKeys: {
    altIsMeta: boolean;
    cmdIsMeta: boolean;
  };
  notifications: {
    font: boolean;
    message: boolean;
    resize: boolean;
    updates: boolean;
  };
  openAt: Record<string, number>;
  padding: string;
  quickEdit: boolean;
  resizeAt: number;
  rows: number | null;
  scrollback: number;
  selectionColor: string;
  showHamburgerMenu: boolean | '';
  showWindowControls: string;
  termCSS: string;
  uiFontFamily: string;
  updateCanInstall: null | boolean;
  updateNotes: string | null;
  updateReleaseUrl: string | null;
  updateVersion: string | null;
  webGLRenderer: boolean;
  webLinksActivationKey: string;
};

export type HyperSession = {
  cleared: boolean;
  cols: number | null;
  pid: number | null;
  resizeAt?: number;
  rows: number | null;
  search: boolean;
  shell: string | null;
  title: string;
  uid: string;
  url: string | null;
  splitDirection?: 'HORIZONTAL' | 'VERTICAL';
  activeUid?: string;
};
export type HyperSessionState = {
  sessions: Record<string, HyperSession>;
  activeUid: string | null;
  write?: any;
};

export type HyperState = {
  ui: HyperUIState,
  termGroups: HyperTermState,
  sessions: HyperSessionState
}