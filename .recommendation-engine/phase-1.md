# Phase 1 — Shared Types

## Pre-requisites

Read `.recommendation-engine/context.md` before starting. Update it after completing this phase.

## Goal

Define the shared TypeScript types for the recommendation engine in `packages/types/src/recommendations.ts` and export them from the package index.

## Steps

### 1. Create `packages/types/src/recommendations.ts`

```typescript
export type RecommendationItem = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
};

export type BecauseYouWatchedRow = {
  seedTitle: string;
  seedType: "movie" | "tv";
  seedId: number;
  items: RecommendationItem[];
};

export type RecommendationsPayload = {
  becauseYouWatched: BecauseYouWatchedRow[];
  topPicks: RecommendationItem[];
  topCategories: Array<{ genreName: string; items: RecommendationItem[] }>;
};
```

### 2. Export from package index

Find the package index file (likely `packages/types/src/index.ts`) and add exports:

```typescript
export * from "./recommendations";
```

### 3. Verify

- Run `pnpm typecheck` — must pass with no errors.

## Context update

After completing, update `.recommendation-engine/context.md`:

- Mark Phase 1 as ✅ Done
- Note the exact file path of the types index and any discovered export patterns
- Correct any assumptions about the types package structure if needed
