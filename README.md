# Owlite

Personal media streaming frontend for Android TV.

## Setup

```bash
pnpm install
pnpm rebuild better-sqlite3
pnpm drizzle-kit push
pnpm dev
```

> `pnpm drizzle-kit push` must be run once after cloning (and again whenever `db/schema.ts` changes) to apply the SQLite schema to `data/owlite.db`. The database file is created automatically.

## Scripts

| Command                       | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `pnpm dev`                    | Start development server                    |
| `pnpm build`                  | Production build                            |
| `pnpm drizzle-kit push`       | Apply DB schema changes to `data/owlite.db` |
| `pnpm typecheck`              | Type-check the project                      |
| `pnpm lint` / `pnpm lint:fix` | Lint with oxlint                            |
| `pnpm fmt`                    | Format code                                 |

## Adding UI components

```bash
npx shadcn@latest add button
```
