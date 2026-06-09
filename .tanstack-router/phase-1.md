# Phase 1 — Fix apps/web Infrastructure

> **Before starting:** Read `.tanstack-router/context.md` fully.
> **After completing:** Update the Phase Completion Log in `context.md`.

## Goal

Replace the scaffolded Tailwind v4 setup with Tailwind v3, add all missing dependencies, configure polyfill toolchain, and align TypeScript target — so the app/web shell is ready to receive the UI code.

---

## Step 1 — Downgrade Tailwind v4 → v3

### package.json

Remove:
```
"@tailwindcss/vite": "^4.x"
"tailwindcss": "^4.x"
```

Add:
```json
"tailwindcss": "^3.4.0",
"autoprefixer": "^10.4.0",
"postcss": "^8.4.0"
```

Keep `@tailwindcss/typography` but ensure it's `^0.5.x` (compatible with Tailwind v3).

Also add to `package.json`:
```json
"browserslist": ["chrome 81"]
```

### vite.config.ts

Remove the `tailwindcss()` import and plugin call. File should look like:

```ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  build: { target: 'chrome81' },
  plugins: [
    devtools(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
})

export default config
```

Note: `build.target: 'chrome81'` ensures Vite's esbuild doesn't transform away things that Chrome 81 supports natively.

---

## Step 2 — Add PostCSS config

Create `apps/web/postcss.config.mjs`:

```js
import flexGapPolyfill from './postcss-flex-gap-polyfill.cjs'

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // flex-gap polyfill for Chrome 81 (no native flex gap until Chrome 84)
  },
}
```

Actually, PostCSS config object-style doesn't support importing CJS plugins directly by reference. Follow the exact same pattern as `apps/owlite/postcss.config.mjs` — open that file and replicate it exactly.

---

## Step 3 — Copy postcss-flex-gap-polyfill.cjs

Copy `apps/owlite/postcss-flex-gap-polyfill.cjs` → `apps/web/postcss-flex-gap-polyfill.cjs` verbatim.

---

## Step 4 — Add tailwind.config.ts

Copy `apps/owlite/tailwind.config.ts` → `apps/web/tailwind.config.ts`.

Update the `content` array from owlite paths to:
```ts
content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}',
],
```

Everything else (theme, plugins, custom `data-*` variants) stays identical.

---

## Step 5 — Update src/styles.css

Replace `@import "tailwindcss"` (v4 syntax) with v3 directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Then append the entire contents of `apps/owlite/app/globals.css` below these directives (includes `.no-scrollbar` and other global overrides).

---

## Step 6 — Add all UI/runtime dependencies

Run in `apps/web/`:

```
pnpm add swr zustand
pnpm add hls.js
pnpm add socket.io-client
pnpm add @ctrl/video-filename-parser
pnpm add core-js
pnpm add sonner
pnpm add react-resizable-panels
pnpm add clsx tailwind-merge
pnpm add class-variance-authority
pnpm add cmdk
pnpm add vaul
pnpm add input-otp
pnpm add embla-carousel-react
pnpm add recharts
pnpm add date-fns
pnpm add @owlite/types@workspace:*
```

All Radix UI packages (copy the full list from `apps/owlite/package.json` — every `@radix-ui/*` entry):
```
pnpm add @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible \
  @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-direction \
  @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label \
  @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover \
  @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area \
  @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider \
  @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs \
  @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group \
  @radix-ui/react-tooltip
```

---

## Step 7 — Update tsconfig.json

Change `"target": "ES2022"` → `"target": "ES2017"`.

This aligns with owlite's TypeScript config and ensures `core-js` polyfills cover the right surface.

---

## Step 8 — Add flex-gap detection script to index.html

In `index.html`, add this inline script inside `<head>` **before** any stylesheet:

```html
<script>
  (function() {
    var div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.rowGap = '1px';
    div.appendChild(document.createElement('div'));
    div.appendChild(document.createElement('div'));
    document.body.appendChild(div);
    var supported = div.scrollHeight === 1;
    document.body.removeChild(div);
    if (!supported) document.documentElement.classList.add('no-flex-gap');
  })();
</script>
```

Also add Google Fonts link tags in `<head>` (Lato, Patrick Hand, Geist Mono) — extract the exact font URLs from `apps/owlite/app/layout.tsx`'s `next/font/google` config. Convert to standard `<link rel="stylesheet">` tags.

---

## Step 9 — Copy components.json

Copy `apps/owlite/components.json` → `apps/web/components.json`.

Update paths within it:
- `"tailwind.css"` → `"src/styles.css"` (or wherever styles.css lives)
- `"aliases.components"` → `"@/components"` (already matches since `@/*` = `src/*`)

---

## Verification

After completing all steps:

1. `pnpm --filter web install` — no unresolved peers
2. `pnpm --filter web typecheck` — no errors (only the empty routes should typecheck for now)
3. `pnpm --filter web dev` — dev server starts, page renders with Tailwind styles applied (not raw HTML)
4. Inspect computed styles — confirm a Tailwind class like `bg-background` resolves to a theme color (proves v3 config loaded)
