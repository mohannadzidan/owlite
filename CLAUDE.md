## Common Scripts

- pnpm lint
- pnpm typecheck: must be run after every change to ensure type safety and catch errors early
- pnpm fmt: must be ran at the end of the task after all other checks are passed to ensure code is formatted correctly

### Code Intelligence

you **MUST** Prefer LSP over Grep/Read for code navigation — it's faster, precise, and avoids reading entire files:

- `workspaceSymbol` to find where something is defined
- `findReferences` to see all usages across the codebase
- `goToDefinition` / `goToImplementation` to jump to source
- `hover` for type info without reading the file

you must use it with all .ts and .tsx files

Use Grep only when LSP isn't available or for text/pattern searches (comments, strings, config).

After writing or editing code, check LSP diagnostics and fix errors before proceeding.
