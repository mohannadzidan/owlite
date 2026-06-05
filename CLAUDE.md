# CLAUDE.md

if you encounter a library you are not familiar with or don't remember its API or facing errors and having troubles using it, use context7 to search and read its documentation and usage examples instead of trying brute force it into working

## Common Scripts

- `pnpm lint` — run oxlint; `pnpm lint:fix` to auto-fix
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

## Architecture

**Owlite** is a Next.js 16 app (App Router) for streaming movies and TV shows, targeting Android TV (Chrome 81, hence the `browserslist` target). No auth layer — it's a personal media frontend.

### Styling

- Tailwind CSS 3 with shadcn/ui components in `components/ui/`.
- you must use `cn()` from @/lib/utils like `cn("bg-primary", isActive && "bg-secondary")` utility (twMerge + clsx) for merging class names and conditionally applying them.
- Always use theme tokens (`bg-primary`, `bg-muted`, `text-muted-foreground`, etc.) rather than raw colors or rgba values.

# Non-Negotiable Principles that must be followed in every code change

## 1. Components display and emit

Props in, events out. Local state is for ephemeral UI only — open/closed, hover. Business logic, API calls, and cross-domain coordination belong outside the component.

---

## 2. Server state and client state belong in separate layers

Fetching libraries (SWR, TanStack Query, React Query) own server state — caching, refetching, deduplication. Your client store owns UI state — selections, panels, multi-step flows. Duplicating server data in the client store creates two sources of truth that drift.

---

## 3. Compute derived values at read time

Storing derived values creates a sync obligation that becomes a bug source. Compute them via selectors instead.

```ts
// Sync obligation — cartTotal must be kept in sync with items manually
{ items: [], cartTotal: 0 }

// No obligation — computed on read
const cartTotal = store.select(s => s.items.reduce((sum, i) => sum + i.price * i.qty, 0));
```

Fetching libraries expose a `select` option for the same purpose on server data.

---

## 4. Name store actions after domain events

`approveOrder`, not `setOrderStatus`. `addItemToCart`, not `updateCart`. Generic setters push decision-making into callers. Domain-named actions keep that logic inside the store where it belongs.

---

## 5. Isolate side effects in plain service functions

API calls, storage, and SDK interactions live in framework-free, store-free service functions. The fetching layer and store actions call services. Components do not.

```ts
// services/orderService.ts — no framework, no store imports
export const orderService = {
  fetchOrders: (userId: string): Promise<Order[]> =>
    fetch(`/api/orders?userId=${userId}`).then((r) => r.json()),
};

// Consumed by the fetching layer
useServerData(["orders", userId], () => orderService.fetchOrders(userId));
```

---

## 6. Coordinate cross-domain logic in one explicit function

When an action spans multiple stores or operations, one plain function owns the entire sequence. Not effects reacting to mutation state. Not stores calling other stores.

```ts
async function checkout(items: CartItem[], userId: string) {
  const order = await orderService.submit(items, userId);
  cartStore.clearCart();
  orderStore.addOrder(order);
  notificationStore.notify("Order placed!");
}
```

---

## 7. Make illegal states unrepresentable

Three boolean flags yield eight combinations — most of them invalid. Model state with discriminated unions so invalid combinations cannot be constructed and don't need to be handled.

```ts
// All eight combinations are valid to the compiler, most are nonsense at runtime
type State = { isLoading: boolean; isError: boolean; isSuccess: boolean; data: Order | null };

// Only four states exist, each carrying exactly the right data
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; order: Order };
```

---

## 8. Wrap libraries with significant internal complexity

Rich text editors, drag-and-drop engines, and chart libraries get a single wrapper. The wrapper converts to and from the library's data model. No library types or APIs cross the boundary — if the library is replaced, only the wrapper changes.

---

## 9. Refactor in working steps

Each step leaves the system functional and shippable. Big rewrites get abandoned halfway, splitting the codebase between two incomplete patterns. Small steps give you a known-good fallback at every point.
