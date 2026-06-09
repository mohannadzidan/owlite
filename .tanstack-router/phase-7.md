# Phase 7 — Observability (Error & Log Reporting)

> **Before starting:** Read `.tanstack-router/context.md` fully. Phases 1–6 must be complete.
> **After completing:** Update the Phase Completion Log in `context.md`.

## Goal

Port the client-side error and log reporting from `apps/owlite/instrumentation-client.ts` into `apps/web`, so production errors from Android TV devices are captured and sent to the fastify backend.

---

## What owlite does

`apps/owlite/instrumentation-client.ts` (loaded by Next.js as an instrumentation hook):

1. Imports `core-js/stable` (moved to `src/polyfills.ts` in Phase 5)
2. WeakRef polyfill (moved to `src/polyfills.ts` in Phase 5)
3. Registers `window.onerror` — captures unhandled JS errors, sends via `navigator.sendBeacon('/client-errors', ...)`
4. Registers `window.onunhandledrejection` — captures unhandled promise rejections
5. Overrides `console.error` — captures console errors
6. Initializes shortcuts system

The fastify backend has `/client-errors` and `/client-logs` endpoints to receive these beacons.

---

## Step 1 — Create src/observability.ts

Create `apps/web/src/observability.ts` by extracting the error/log reporting logic from `apps/owlite/instrumentation-client.ts`:

```ts
import { getClientProfileId } from '@/lib/profile-id'

const API_URL = import.meta.env.VITE_API_URL

function sendBeacon(endpoint: string, payload: unknown) {
  const url = `${API_URL}${endpoint}`
  navigator.sendBeacon(url, JSON.stringify(payload))
}

export function initObservability() {
  // Unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    sendBeacon('/client-errors', {
      profileId: getClientProfileId(),
      message,
      source,
      lineno,
      colno,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    })
  }

  // Unhandled promise rejections
  window.onunhandledrejection = (event) => {
    sendBeacon('/client-errors', {
      profileId: getClientProfileId(),
      message: String(event.reason),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
    })
  }

  // Console errors
  const originalConsoleError = console.error.bind(console)
  console.error = (...args) => {
    originalConsoleError(...args)
    sendBeacon('/client-logs', {
      profileId: getClientProfileId(),
      level: 'error',
      message: args.map(String).join(' '),
      timestamp: new Date().toISOString(),
    })
  }
}
```

**Important:** Copy the exact implementation from `instrumentation-client.ts` rather than reimplementing from memory — the above is illustrative.

---

## Step 2 — Initialize in main.tsx

In `apps/web/src/main.tsx`, call `initObservability()` early (after polyfills, before render):

```ts
import './polyfills'
import { initObservability } from './observability'

initObservability()

// ... rest of main.tsx (createRouter, ReactDOM.render, etc.)
```

---

## Step 3 — Initialize shortcuts

`instrumentation-client.ts` also initializes the shortcuts system. Check `apps/owlite/lib/shortcuts/` for an `init` function and call it in `main.tsx` similarly.

---

## Verification

1. `pnpm --filter web typecheck` — no errors
2. Trigger a test error in the browser console: `throw new Error("test")`
3. Check Network tab — a `POST /client-errors` beacon should appear (may fail if API not running, but the request should be attempted)
4. Verify `console.error("test")` also triggers a beacon
