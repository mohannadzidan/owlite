import "core-js/stable";

// @ts-expect-error WeakRef not in Chrome 81 type lib
if (typeof window !== "undefined" && typeof WeakRef === "undefined") {
  // @ts-expect-error polyfill
  globalThis.WeakRef = class WeakRef {
    _target: unknown;
    constructor(target: unknown) {
      this._target = target;
    }
    deref() {
      return this._target;
    }
  };
}
