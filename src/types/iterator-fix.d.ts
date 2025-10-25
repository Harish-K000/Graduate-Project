declare global {
  interface Generator<T = unknown, TReturn = any, TNext = any> {
    [Symbol.dispose]?(): void;
  }
}

export {}
