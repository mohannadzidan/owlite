if you encounter a library you are not familiar with or don't remember its API or facing errors and having troubles using it, use context7 to search and read its documentation and usage examples instead of trying brute force it into working

- `pnpm typecheck` — must be run after every change to ensure type safety and catch errors early
- `pnpm fmt` — must be run at the end of the task after all other checks are passed to ensure code is formatted correctly

You **MUST** use LSP over Grep/Read for code navigation — it's faster, precise, and avoids reading entire files:

- `workspaceSymbol` to find where something is defined
- `findReferences` to see all usages across the codebase
- `goToDefinition` / `goToImplementation` to jump to source
- `hover` for type info without reading the file

You must use it with all `.ts` and `.tsx` files.

Use Grep/Search only for text/pattern searches (comments, strings, config).

After writing or editing code, check LSP diagnostics and fix errors before proceeding.

---

## Architecture

**Owlite** is a Next.js 16 app (App Router) for streaming movies and TV shows, targeting Android TV (Chrome 81, hence the `browserslist` target). No auth layer — it's a personal media server that typically runs on same LAN.

### Styling

- Tailwind CSS 3 with shadcn/ui components in `components/ui/`.
- you must use `cn()` from @/lib/utils like `cn("bg-primary", isActive && "bg-secondary")` utility (twMerge + clsx) for merging class names and conditionally applying them.
- Always use theme tokens (`bg-primary`, `bg-muted`, `text-muted-foreground`, etc.) rather than raw colors or rgba values.
- Alway use existing shadcn/ui components, and DON'T create new ones unless absolutely necessary. If you need a new component, first check if it can be composed from existing ones.

---

# Non-Negotiable Principles that must be followed in every code change

## 1. Components display and emit — shadcn/ui gives you the building blocks

shadcn/ui components (Button, Dialog, Badge, etc.) are already well-built display primitives. Your job in a feature component is to wire them to your data and forward the right callbacks — not to inline logic inside them.

Radix UI primitives (the foundation of shadcn) are designed to be controlled from outside. Lean into that: let Zustand own the open/closed state of a Dialog or Sheet, and let the component just reflect it.

---

## 2. SWR owns server state — Zustand owns UI state

The expensive mistake is copying SWR data into Zustand. You end up with two sources of truth that drift apart, and a pile of `useEffect`s trying to sync them.

SWR was built for server state: caching, deduplication, background revalidation, loading and error handling. Let it own all of that. Zustand handles what SWR cannot: selections, multi-step form progress, open panels, modal state.

---

## 3. Compute derived values at read time — never store them

Storing a derived value creates a sync obligation. Every time the source changes, the copy has to be updated. That obligation is where bugs live — stale totals, wrong counts, UI that reflects yesterday's data.

SWR doesn't have a built-in `select` option like TanStack Query. Transform server data directly at the call site instead of storing the transformed copy anywhere.

---

## 4. Name Zustand actions and SWR mutations after domain events

When an action is named `setOrderStatus`, every caller has to know what status to pass and why — that decision leaks out everywhere. When it's named `approveOrder`, the logic for what "approving" means lives in one place.

The same applies to `useSWRMutation` — the key and trigger name should describe what happened, not what HTTP method was used.

---

## 5. Fetcher functions are your service layer

SWR's `fetcher` argument is where your API logic lives — not inside components, not in Zustand actions. Extract all `fetch` calls into plain service files with no SWR, React, or Zustand imports. SWR calls these. Zustand actions call these. Components never reach past them.

You can test `productService.fetchAll` without mounting a component or touching SWR. Switching from REST to GraphQL means touching only the service file — nothing else in your app changes.

---

## 6. Coordinate cross-domain logic in one function — use SWR's `mutate` to close the loop

When one user action touches multiple stores or triggers cache invalidation, that coordination belongs in one explicit function. Not scattered across `useEffect`s, not buried inside a Zustand action that secretly reaches into SWR's cache.

After a mutation succeeds, `mutate` from SWR is how you tell the cache that specific data is now stale. That call belongs in the same function that triggered the mutation.

---

## 7. Use TypeScript to make illegal states unrepresentable

Boolean flags for async state almost always permit combinations that shouldn't exist: `isLoading: true` and `isSuccess: true` at the same time, `data` being non-null when `isError` is true. SWR's own internals model their state correctly — apply the same discipline to your own Zustand stores.

---

## 8. Own your shadcn/ui components — extend them, don't patch them inline

shadcn/ui copies component source into your `/components/ui/` directory. These files are yours. When you need a variant that doesn't exist, add it to the component itself using `cva` — the same system shadcn already uses. Don't reach in with ad-hoc `className` overrides spread across the codebase.

Radix UI primitives follow the same rule: wrap them once for each domain use case so the Radix API never leaks into your feature components.

---

## 9. TanStack Router search params replace URL-driven Zustand state

Zustand is the wrong place for state that belongs in the URL — filters, sort order, pagination, tab selection. This state needs to survive a page refresh, be shareable via link, and work with the browser back button. TanStack Router gives you typed, validated search params that do all of this automatically.

The split is: Zustand for UI state no one needs to link to (which modal is open, hover states, multi-step form progress mid-completion). TanStack Router search params for state that represents a _view_ of the data someone might want to share or return to.

---

## 10. Move in small working steps

Large refactors get abandoned halfway, leaving two competing patterns and no clear path forward. Every step of a refactor should leave the app in a working, shippable state.

Each step is independently shippable. When something breaks, you know exactly which step caused it and can revert just that step without undoing everything else.
