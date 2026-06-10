# Phase 5 — Polyfills & Chrome 81 Browser Compat

> **Before starting:** Read `.tanstack-router/context.md` fully. Phases 1–4 must be complete.
> **After completing:** Update the Phase Completion Log in `context.md`.

## Goal

Ensure `apps/web` has the same polyfill coverage as `apps/owlite` for Chrome 81 support. Three separate concerns: ES2017+ builtins (core-js), WeakRef, and flex-gap CSS.

---

## Why Chrome 81?

The app targets Android TV devices. The browser on those devices is Chrome 81 (circa 2020). Chrome 81 is missing:

- Many ES2020+ built-ins (covered by core-js)
- `WeakRef` and `FinalizationRegistry` (custom polyfill needed)
- CSS `gap` property in flexbox contexts (added in Chrome 84) — covered by PostCSS plugin

---

## Step 1 — Create src/polyfills.ts

Create `apps/web/src/polyfills.ts`:

```ts
// ES2017+ built-ins for Chrome 81
import "core-js/stable";

// WeakRef polyfill for Chrome 81 (WeakRef shipped in Chrome 84)
if (typeof WeakRef === "undefined") {
  // @ts-expect-error polyfill
  globalThis.WeakRef = class WeakRef<T extends object> {
    private _target: T;
    constructor(target: T) {
      this._target = target;
    }
    deref(): T {
      return this._target;
    }
  };
}

// FinalizationRegistry stub (no-op — Chrome 84+)
if (typeof FinalizationRegistry === "undefined") {
  // @ts-expect-error polyfill
  globalThis.FinalizationRegistry = class FinalizationRegistry {
    constructor(_callback: unknown) {}
    register() {}
    unregister() {}
  };
}
```

Check `apps/owlite/instrumentation-client.ts` for the exact WeakRef polyfill code — copy verbatim to be safe.

---

## Step 2 — Import polyfills first in main.tsx

In `apps/web/src/main.tsx`, the **very first import** must be the polyfills:

```ts
import "./polyfills"; // must be first — loads core-js before any app code

import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
// ... rest of main.tsx
```

Import order matters — core-js must run before any code that relies on polyfilled built-ins.

---

## Step 3 — Flex-gap PostCSS polyfill (verify from Phase 1)

This should be set up in Phase 1. Confirm it's working:

1. `postcss-flex-gap-polyfill.cjs` exists at `apps/web/postcss-flex-gap-polyfill.cjs`
2. It's registered in `apps/web/postcss.config.mjs`
3. The flex-gap detection script is in `index.html` (adds `.no-flex-gap` class to `<html>`)

How it works together:

- Detection script adds `.no-flex-gap` to `<html>` at page load (synchronous, before paint)
- PostCSS plugin transforms CSS during build: for every `gap: Xpx` on a flex container, it generates a `.no-flex-gap` prefixed rule using negative margins as fallback
- Chrome 81 gets the margin fallback; Chrome 84+ gets native gap

---

## Step 4 — Verify browserslist

`apps/web/package.json` must have:

```json
"browserslist": ["chrome 81"]
```

This is used by:

- `autoprefixer` — adds vendor prefixes as needed
- The flex-gap polyfill PostCSS plugin — it reads browserslist to decide whether to emit fallbacks
- Vite's `build.target: 'chrome81'` (set in Phase 1) — controls esbuild output

---

## Step 5 — Verify Vite build target

`apps/web/vite.config.ts` must have `build: { target: 'chrome81' }`.

This tells esbuild not to use syntax that Chrome 81 can't parse. ES2017 class fields, optional chaining — all supported in Chrome 81, so this is mostly a safety net.

---

## Verification

1. `pnpm --filter web build` — build completes without error
2. Inspect the built JS bundle: `grep -l "core-js"` should find something in `dist/`
3. Inspect the built CSS bundle: search for `.no-flex-gap` rules — they should be present if any flex containers use `gap`
4. Open the app in a browser with DevTools emulating Chrome 81 (User Agent Switcher) — no `WeakRef is not defined` or similar errors
5. Confirm flex-gap layout looks correct (test a component with `flex` + `gap` classes)
