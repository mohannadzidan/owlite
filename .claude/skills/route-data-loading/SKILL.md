# Route Data Loading in Owlite

## Decision: loader vs SWR

| Scenario                                             | Use                                                |
| ---------------------------------------------------- | -------------------------------------------------- |
| Data required before the page renders (no flicker)   | **Route loader**                                   |
| Data that revalidates in the background after render | **SWR with `fallbackData` seeded from the loader** |
| Data triggered by user interaction (search, filters) | **SWR only** (no loader)                           |
| Mutations (create / update / delete)                 | **Local state + service call directly**            |

The rule: loaders own the _initial fetch_, SWR owns _background revalidation_. Never put loader data into Zustand.

---

## Pattern 1 — Pure loader (no SWR needed)

Use when the data is only read once per navigation and mutations are handled locally (e.g. profiles page).

```tsx
// apps/web/src/routes/profiles/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { profileService } from "@/services/profile.service";
import FullScreenSpinner from "@/components/fullscreen-spinner";

export const Route = createFileRoute("/profiles/")({
  loader: () => profileService.listProfiles(),
  pendingComponent: FullScreenSpinner,
  component: ProfilesPage,
});

function ProfilesPage() {
  // Loader data is resolved before this renders — no undefined, no flicker.
  const initialProfiles = Route.useLoaderData();
  const [profiles, setProfiles] = useState(initialProfiles);
  // mutations update local state directly without re-fetching
}
```

---

## Pattern 2 — Loader seeds SWR fallback

Use when the data needs background revalidation after the initial render (e.g. home page trending + continue-watching).

```tsx
// apps/web/src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { tmdb } from "@/services/tmdb.service";
import { profileService } from "@/services/profile.service";
import { getClientProfileId } from "@/lib/profile-id";
import FullScreenSpinner from "@/components/fullscreen-spinner";
import HomeClient from "@/home-client";

export const Route = createFileRoute("/")({
  loader: async () => {
    const profileId = getClientProfileId();
    const [discoverResult, continueWatching] = await Promise.all([
      tmdb.trending.trending("all", "day"),
      profileId ? profileService.getContinueWatching(profileId) : Promise.resolve([]),
    ]);
    if ("error" in discoverResult) throw discoverResult;
    return { discoverData: discoverResult, continueWatching };
  },
  pendingComponent: FullScreenSpinner,
  component: HomeClient,
});
```

```tsx
// apps/web/src/home-client.tsx  (the component)
import { useLoaderData } from "@tanstack/react-router";

export default function HomeClient() {
  // useLoaderData({ from }) avoids circular imports when the component
  // lives in a separate file from its route definition.
  const { discoverData: initialDiscoverData, continueWatching: initialContinueWatching } =
    useLoaderData({ from: "/" });

  // Pass loader data as fallbackData so SWR renders synchronously on mount.
  const { data: discoverData } = useSWR(
    "tmdb-discover",
    async () => {
      /* fetch */
    },
    { fallbackData: initialDiscoverData },
  );

  // Hooks that wrap SWR internally should accept initialData and forward it.
  const { continueWatching } = useContinueWatching(initialContinueWatching);
}
```

---

## pendingComponent

Always use `FullScreenSpinner` as the `pendingComponent` — it is the project-standard loading UI located at `@/components/fullscreen-spinner`.

```tsx
import FullScreenSpinner from "@/components/fullscreen-spinner";

export const Route = createFileRoute("/some-path")({
  loader: () => someService.fetchData(),
  pendingComponent: FullScreenSpinner,
  component: SomePage,
});
```

`pendingComponent` renders while the loader is in flight. By default TanStack Router waits 1 second before showing it (`pendingMs: 1000`). For pages where you always want the spinner immediately:

```tsx
export const Route = createFileRoute("/some-path")({
  loader: () => someService.fetchData(),
  pendingMs: 0,
  pendingComponent: FullScreenSpinner,
  component: SomePage,
});
```

---

## Hooks that wrap SWR

When a custom hook wraps SWR and its data is fetched in a loader, add an optional `initialData` parameter:

```ts
// Before
export function useContinueWatching() {
  const { data, mutate } = useSWR(key, fetcher, { fallbackData: [] });
}

// After
export function useContinueWatching(initialData?: ContinueWatchingEntry[]) {
  const { data, mutate } = useSWR(key, fetcher, { fallbackData: initialData ?? [] });
}
```

---

## Avoiding circular imports

When a route component lives in a separate file (e.g. `home-client.tsx`), importing `Route` from the route file creates a circular dependency. Instead use the standalone hook with `from`:

```ts
// ✗ circular — don't do this in home-client.tsx
import { Route } from "@/routes/index";
const data = Route.useLoaderData();

// ✓ correct
import { useLoaderData } from "@tanstack/react-router";
const data = useLoaderData({ from: "/" });
```

For components colocated in the route file (like profiles), `Route.useLoaderData()` is preferred as it gives full type inference without the `from` string.

---

## Parallel fetches in loaders

Always use `Promise.all` when the loader needs multiple independent data sources. Never await them sequentially.

```ts
loader: async () => {
  const [data1, data2] = await Promise.all([
    service1.fetch(),
    service2.fetch(),
  ]);
  return { data1, data2 };
},
```
