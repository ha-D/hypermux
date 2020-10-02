export default class Scanner {
  raw: string;
  p: number;
  
  constructor(raw: string) {
    this.raw = raw;
    this.p = 0;
  }

  skip(c: number): this {
    this.skipSpaces()
    this.p += c;
    return this;
  }

  skipSpaces(): this {
    let c = 0;
    while (this.peekAt(c) === ' ') {
      c += 1;
    }
    this.p += c;
    return this;
  }

  skipWord(): this {
    this.readWord();
    return this;
  }

  peekAt(c?: number): string | null {
    c = c || 0;
    if (this.p + c < this.raw.length) {
      return this.raw[this.p + c];
    }
    return null;
  }

  take(c: number): string {
    if (this.p + c > this.raw.length) {
      throw new Error(`Scan error: not enough characters to take at position ${this.p}:${this.p + c}`);
    }
    const res = this.raw.substr(this.p, c)
    this.p += c;
    return res;
  }

  has(c: number): boolean {
    return this.p + c < this.raw.length;
  }

  readNumber(): number {
    this.skipSpaces();
    const isDigit = (c: string | null) => c != null && c >= '0' && c <= '9';
    let c = 0;
    while (isDigit(this.peekAt(c))) c++;
    if (c === 0) throw new Error(`Scan error: no number to be read at position ${this.p}`);
    return parseInt(this.take(c));
  }

  readWord(): string {
    this.skipSpaces();
    let c = 0;
    while (this.has(c) && this.peekAt(c) !== ' ') {
      c += 1;
    }
    return this.take(c);
  }

  read(val: string): string {
    for (let c = 0; c < val.length; c++) {
      if (this.raw[this.p + c] !== val[c]) {
        throw new Error(`Scan error: expected ${val[c]} but got ${this.raw[this.p + c]}`);
      }
    }
    this.skip(val.length);
    return val;
  }

  readAll(): string {
    return this.raw.slice(this.p + 1);
  }
  
  expect(val: string): this {
    this.read(val);
    return this;
  }

  expectNumber(): this {
    this.readNumber();
    return this;
  }
}
