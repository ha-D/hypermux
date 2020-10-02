import { EventEmitter } from "events";
import { AppRPC } from "../rpc";

export interface HyperApp {
  createWindow(cb: (win: HyperWindow) => void): void
}

export interface HyperWindow {
  uid: string;
  sessions: Map<any, any>;
  focusTime: number;
  clean: () => void;
  rpc: AppRPC;

  tmuxify: (ctrlSession: HyperSession) => void
}

export interface HyperSession extends EventEmitter {
  setActive(): void;
  pty: IPty
}

export interface IPty {
  readonly pid: number;
  readonly cols: number;
  readonly rows: number;
  readonly process: string;
  handleFlowControl: boolean;
  on(event: 'data', listener: (data: string) => void): void;
  on(event: 'exit', listener: (exitCode: number, signal?: number) => void): void;
  resize(columns: number, rows: number): void;
  write(data: string): void;
  kill(signal?: string): void;
}