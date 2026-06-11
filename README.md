# Owlite

Personal media streaming server for Android TV. No auth layer — designed for same-LAN use.

## Architecture

Monorepo managed with pnpm workspaces and Turborepo.

| Package          | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `apps/web`       | React + Vite SPA (targets Chrome 81 for Android TV), served via lighttpd |
| `apps/api`       | Fastify REST + Socket.IO backend, SQLite via Drizzle ORM                 |
| `packages/types` | Shared TypeScript types between web and api                              |

### External integrations

- **TMDB** — movie/TV metadata
- **OpenSubtitles** — subtitle search and download
- **StreamIMDB** — HLS stream source

## Running with Docker

```sh
docker compose up
```

Runs three containers: `web`, `api`, and a `proxy` (lighttpd on port 80). The SQLite database is persisted in the `owlite-data` volume.

Copy `apps/api/.env.example` to `apps/api/.env` and fill in the required keys before starting:

```
OPENSUBTITLES_API_KEY=...
TMDB_API_KEY=...
```

## Development

```sh
pnpm install
pnpm dev        # starts all apps via turbo
```

The web app runs on `http://localhost:3000`, the API on `http://localhost:8080`.

## Database migrations

Migrations in `apps/api/src/db/migrations/` run automatically on every server startup — no manual commands needed in production.

**When you change `apps/api/src/db/schema.ts`:**

1. Edit the schema file.
2. Generate a migration:
   ```sh
   pnpm --filter api db:generate
   ```
3. Commit the schema change and the generated migration file together.

Rules:

- Never edit or delete existing migration files — always add new ones.
- Never run `drizzle-kit push` against production; it bypasses migration history.

## Adding shadcn/ui components

```sh
npx shadcn@latest add <component>
```

## Scripts

| Command          | Description                |
| ---------------- | -------------------------- |
| `pnpm dev`       | Start all apps in dev mode |
| `pnpm build`     | Build all apps             |
| `pnpm typecheck` | Type-check all packages    |
| `pnpm lint`      | Lint with oxlint           |
| `pnpm fmt`       | Format with oxfmt          |
