import { remove } from "lodash";

type Options = {
  count?: number,
  time?: number,
}

export default class EventBlocker {
  blockers: Record<string, Options[]> = {};

  isBlocked(event: string): boolean {
    if (event in this.blockers) {
      const blockers = this.blockers[event];
      const blocked = blockers.length > 0;
      for (const blocker of blockers) {
        if (blocker.count !== undefined && blocker.count > 0) {
          blocker.count -= 1;
          break;
        }
      }
      remove(blockers, (o) => o.count !== undefined && o.count <= 0);
      if (blocked) {
        return true;
      }
    }
    return false;
  }

  blockEvent(ev: string | string[], options?: Options): Function {
    const events = typeof(ev) === 'string' ? [ev] : ev; 
    for (let event of events) {
      if (!(event in this.blockers)) {
        this.blockers[event] = [];
      }
      if (options === undefined) {
        options = {};
      }
      const blockers = this.blockers[event];
      blockers.push(options);
      if (options.time) {
        setTimeout(() =>  remove(blockers, (o) => o === options), options.time);
      }
    }
    return () => {
      for (let event of events) {
        const blockers = this.blockers[event];
        remove(blockers, (o) => o === options);
      }
    }
  }
}