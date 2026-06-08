FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- install dependencies (native build tools needed for better-sqlite3) ---
FROM base AS deps
RUN --mount=type=cache,id=apk,target=/var/cache/apk \
    apk add python3 make g++
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/package.json
COPY apps/owlite/package.json ./apps/owlite/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- build Next.js ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/owlite/node_modules ./apps/owlite/node_modules
COPY packages ./packages
COPY apps/owlite ./apps/owlite
COPY package.json pnpm-workspace.yaml ./
RUN pnpm --filter owlite build

# --- runtime image ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Installed node_modules (includes compiled better-sqlite3 native addon)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/owlite/node_modules ./apps/owlite/node_modules
# Build output and static assets
COPY --from=builder /app/apps/owlite/.next ./apps/owlite/.next
COPY --from=builder /app/apps/owlite/public ./apps/owlite/public
# @owlite/types is a workspace symlink; its source must be present at runtime
COPY packages/types/src ./packages/types/src
COPY packages/types/package.json ./packages/types/package.json
# App manifest (needed for next start to find config)
COPY apps/owlite/package.json ./apps/owlite/package.json
COPY apps/owlite/next.config.ts ./apps/owlite/next.config.ts
# Migrations are applied automatically on startup via instrumentation.ts
COPY apps/owlite/db/migrations ./apps/owlite/db/migrations
COPY package.json ./

EXPOSE 3000
WORKDIR /app/apps/owlite
CMD ["node_modules/.bin/next", "start"]
