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

## 1. Push "use client" to the leaves — Server Components fetch and render

Keep Server Components at the top. Push "use client" as far down the tree as possible — ideally to the single element that actually needs interactivity. always prefer highly composable elements that can be constructed in the page level directly like how shadcn/ui components are designed. The point is to avoid making the entire page a Client Component when only a small part of it needs to be.

## 2. Server Components fetch, TanStack Query caches on the client, Zustand owns UI state

These three tools are not interchangeable — each owns a distinct layer, and the expensive mistake is blurring those lines.

- Server Components — data that doesn't need to be interactive or re-fetched after the initial render. Zero JS cost, runs at request time or build time.
- TanStack Query — client-side server state: data fetched from the client
- Zustand — pure UI state: which tab is selected, whether a modal is open, what's in the cart locally.

Putting server data into Zustand is the most common and costly version of this mistake. You end up owning the cache yourself — manually syncing, manually invalidating, manually handling loading states that TanStack Query gives you for free.

## 3. Use Server Actions for mutations, Route Handlers for external integrations

Next.js gives you two ways to run server-side logic: Server Actions and Route Handlers. They solve different problems and using the wrong one for the job adds unnecessary indirection.

- Server Actions — for mutations triggered by user interactions inside your app: form submissions, button clicks, anything a Client Component initiates. No HTTP layer to build or maintain.
- Route Handlers — for things outside your React app: incoming webhooks, OAuth callbacks, third-party integrations, or when you genuinely need a public API endpoint.

## 4. Compute derived values — never store them

Both Zustand selectors and TanStack Query's `select` option are built exactly for this.

## 5. Name Server Actions and store mutations after domain events

When an action is named `setOrderStatus`, callers have to decide what status to pass and understand the side effects — that knowledge leaks out of the action and scatters across the codebase. When it's named `approveOrder`, the logic for what "approving" means lives in one place.

## 6. Side effects belong in plain service functions

API calls, database queries, third-party SDK interactions — all of it goes into plain service files with no Next.js, React, or Zustand imports. Your Server Actions call these. TanStack Query calls these. Server Components call these. Nothing reaches past them.

## 7. Coordinate cross-domain logic explicitly in one place

When a user action touches multiple stores, invalidates multiple queries, or triggers multiple operations — that coordination belongs in one explicit function. Not scattered across `useEffect`s watching mutation state. Not buried in a store that secretly reaches into another.

## 8. Use TypeScript to make illegal states unrepresentable

A discriminated union allows only the combinations that actually make sense, and TypeScript narrows automatically inside each branch.

## 9. Wrap complex libraries and Next.js navigation APIs

If a library has its own data model, event system, and lifecycle — wrap it in one component. The wrapper converts app's plain data into what the library needs, and converts library events back into your app's actions. This also applies to Next.js's own navigation hooks: wrapping them means your components stay decoupled from routing internals.

## 10. Move in small working steps

Every refactor step should leave the app in a working, shippable state. Every step is independently reviewable and deployable. When something breaks, you know exactly which step caused it.
