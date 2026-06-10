FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- prune workspace to only what api needs ---
FROM base AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY . .
RUN npx turbo prune api --docker

# --- install dependencies from pruned lockfile ---
FROM base AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=pruner /app/out/full/ .
RUN ./apps/api/node_modules/.bin/tsc -p packages/types/tsconfig.build.json
RUN pnpm --filter api build

# --- runtime ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types ./packages/types

EXPOSE 8080
WORKDIR /app/apps/api
CMD ["node", "dist/src/index"]
