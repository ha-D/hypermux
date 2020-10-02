import { HyperUID, TmuxID } from '../types';


const BASE_ID = 'tmux';

export function getTermGroupFromPane(windowID: TmuxID, paneIndex: number): HyperUID {
  return `${BASE_ID}-win-${windowID}-group-${paneIndex}`;
}

export function getTmuxWindowFromTermGroup(termGroup: HyperUID): TmuxID | null {
  const reg = new RegExp(`${BASE_ID}-win-(\\d+)-group-\\d+`);
  const match = reg.exec(termGroup);
  if (match) {
    return parseInt(match[1]);
  }
  return null;
}