# Owlite

Personal media streaming frontend for Android TV.

## Database migrations

Migrations in `apps/owlite/db/migrations/` are applied automatically on every server startup via `instrumentation.ts` — no manual commands needed in production.

### When you change `db/schema.ts`

1. Edit `apps/owlite/db/schema.ts`.
2. Generate a new migration file:
   ```sh
   pnpm --filter owlite db:generate
   ```
3. Commit the schema change and the generated file in `db/migrations/` together.

On next startup (dev restart or production deploy) the new migration runs automatically.

### Rules

- Never edit or delete existing files in `db/migrations/` — always add new ones.
- Never run `drizzle-kit push` against the production database; it bypasses migration history.
- Keep each migration focused on a single schema change.

## Adding UI components

```bash
npx shadcn@latest add button
```
