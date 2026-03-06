# =============================================================================
# Knowledge Agent Template - Production image (no Vercel; dedicated server)
# =============================================================================
# Build: docker build -t 1119-kb .
# Run:   docker run -p 3000:3000 --env-file apps/app/.env 1119-kb
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies and build
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

# Install Bun via official install script
RUN apk add --no-cache curl bash \
    && curl -fsSL https://bun.com/install | bash

ENV BUN_INSTALL=/root/.bun
ENV PATH=$BUN_INSTALL/bin:$PATH

WORKDIR /app

# Copy workspace and lockfile
COPY package.json bun.lock ./
COPY turbo.json ./
COPY patches ./patches/

# Copy package manifests
COPY apps/app/package.json ./apps/app/
COPY packages/agent/package.json ./packages/agent/
COPY packages/github/package.json ./packages/github/
COPY packages/sdk/package.json ./packages/sdk/

# Install all dependencies (skip prepare script — we build after copying source)
RUN bun install --frozen-lockfile --ignore-scripts

# Copy full source
COPY apps ./apps
COPY packages ./packages

# Required by nuxt-better-auth at build time (pass via docker build --build-arg or compose build args)
ARG BETTER_AUTH_SECRET
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

# Avoid "JavaScript heap out of memory" during Nuxt build. If build still OOMs, increase Docker memory (e.g. 6–8GB).
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build workspace packages then the Nuxt app
RUN bun run build --filter=@savoir/app

# -----------------------------------------------------------------------------
# Stage 2: Production runtime
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxt

# Copy built app (Nitro output is self-contained)
COPY --from=builder --chown=nuxt:nodejs /app/apps/app/.output ./.output

# Optional: persist blob/data at runtime
RUN mkdir -p .data && chown -R nuxt:nodejs .data

USER nuxt

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

EXPOSE 3000

# Run the Nitro server
CMD ["node", ".output/server/index.mjs"]
