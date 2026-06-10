FROM node:22-alpine AS base
RUN corepack enable

# --- prune workspace to only what web needs ---
FROM base AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY . .
RUN npx turbo prune web --docker

# --- install dependencies from pruned lockfile ---
FROM base AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=pruner /app/out/full/ .
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter web build

# --- serve static files with lighttpd ---
FROM alpine:3.21
RUN apk add --no-cache lighttpd
COPY --from=builder /app/apps/web/dist /var/www/html
COPY apps/web/lighttpd.conf /etc/lighttpd/lighttpd.conf
EXPOSE 3000
CMD ["lighttpd", "-D", "-f", "/etc/lighttpd/lighttpd.conf"]
