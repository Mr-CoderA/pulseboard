/** Injectable clock so standup dates and JWT lifetimes can be frozen in tests. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now(): Date {
    return new Date();
  },
};

export class FrozenClock implements Clock {
  private current: Date;

  constructor(current: Date) {
    this.current = new Date(current.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(next: Date): void {
    this.current = new Date(next.getTime());
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}
