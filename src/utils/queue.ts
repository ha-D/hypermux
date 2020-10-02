export default class Queue<T> {
  q: (T | null)[]
  capacity: number
  sP: number
  eP: number

  constructor(capacity=10) {
    this.q = Array(capacity).fill(null);
    this.capacity = capacity;
    this.sP = -1;
    this.eP = 0;
  }

  length(): number {
    return this.eP - this.sP - 1;
  }

  isFull(): boolean {
    return this.length() === this.capacity;
  }

  isEmpty(): boolean {
    return this.length() === 0;
  }

  put(item: T) {
    if (this.isFull()) {
      throw new Error('Queue is full');
    }
    this.q[this.eP % this.capacity] = item;
    this.eP += 1;   
  }

  get(): T | null {
    if (this.isEmpty()) {
      return null;
    }
    this.sP += 1;
    const val = this.q[this.sP % this.capacity];
    this.q[this.sP % this.capacity] = null;
    return val;
  }
}
