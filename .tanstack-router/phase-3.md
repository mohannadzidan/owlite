# Phase 3 — Copy components/

> **Before starting:** Read `.tanstack-router/context.md` fully. Phases 1–2 must be complete.
> **After completing:** Update the Phase Completion Log in `context.md`.

## Goal

Copy all React components from `apps/owlite/components/` into `apps/web/src/components/` and replace every Next.js-specific API.

---

## Step 1 — Copy components/

```
cp -r apps/owlite/components/ apps/web/src/components/
```

This includes:
- `components/ui/` — all ~40 shadcn/ui components (Radix-based, no Next.js dependencies)
- `components/navigation.tsx`
- `components/profile-guard.tsx`
- `components/remote/` (6 files)
- `components/typography/`
- All other top-level components

---

## Step 2 — Replace Next.js imports

Run a search across `apps/web/src/components/` for `from "next/` and fix each occurrence.

### Replacement table

| Find | Replace |
|---|---|
| `import Link from "next/link"` | `import { Link } from "@tanstack/react-router"` |
| `import Image from "next/image"` | *(delete import, replace `<Image>` with `<img>`)* |
| `import { useRouter } from "next/navigation"` | `import { useNavigate } from "@tanstack/react-router"` |
| `import { usePathname } from "next/navigation"` | `import { useLocation } from "@tanstack/react-router"` |
| `import { useParams } from "next/navigation"` | `import { useParams } from "@tanstack/react-router"` |
| `import { useSearchParams } from "next/navigation"` | handled per-route via `Route.useSearch()` — if in a shared component, use `useSearch` from router |
| `import { notFound } from "next/navigation"` | replace usage with redirect or `throw` |

### next/image → img

`<Image src={x} alt={y} width={w} height={h} />` → `<img src={x} alt={y} width={w} height={h} />`

For images with `fill` prop: use `style={{ width: '100%', height: '100%', objectFit: 'cover' }}` on the `<img>`.

### useRouter → useNavigate

```ts
// Before
const router = useRouter()
router.push('/path')
router.replace('/path')
router.back()

// After
const navigate = useNavigate()
navigate({ to: '/path' })
navigate({ to: '/path', replace: true })
history.back() // or window.history.back()
```

### usePathname → useLocation

```ts
// Before
const pathname = usePathname()

// After
const { pathname } = useLocation()
```

### Link from next/link → TanStack Link

```tsx
// Before
<Link href="/profiles">text</Link>

// After
<Link to="/profiles">text</Link>
```

Note: TanStack Router `Link` uses `to` prop, not `href`.

---

## Step 3 — Audit specific files

### components/profile-guard.tsx

This component:
1. Reads `getClientProfileId()` from `@/lib/profile-id`
2. Checks current pathname
3. Redirects to `/profiles` if no profile is set and not already on `/profiles`

Replace `useRouter` + `usePathname` with TanStack Router equivalents. The redirect logic should use `useNavigate` + `useLocation`.

### components/navigation.tsx

Likely uses `Link` and `usePathname` for active state. Replace both per table above.

### components/remote/remote-control-provider.tsx

Uses `socket.io-client`. No Next.js dependencies expected — verify and copy as-is.

---

## Step 4 — Remove "use client" directives

Every component file likely has `"use client"` at the top (required in Next.js for client components). In Vite, this directive is meaningless and should be removed from all files.

Quick approach — search and remove:
```
grep -r '"use client"' apps/web/src/components/
```
Remove those lines. Same for `'use client'` (single quotes).

---

## Step 5 — Update path aliases

All `@/` imports should already resolve correctly since `tsconfig.json` maps `@/*` → `./src/*`. Verify no imports use Next.js-specific absolute paths.

---

## Verification

1. `pnpm --filter web typecheck` — no errors in components/
2. Confirm no remaining `from "next/` imports: `grep -r 'from "next/' apps/web/src/components/`
3. Confirm no remaining `"use client"`: `grep -r '"use client"' apps/web/src/components/`
