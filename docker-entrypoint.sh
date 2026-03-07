#!/bin/sh
set -e

# Optional: refresh VERCEL_OIDC_TOKEN non-interactively at container startup.
# Requires VERCEL_TOKEN and an already linked project (apps/app/.vercel/project.json).
AUTO_PULL="${AUTO_PULL_VERCEL_OIDC_TOKEN:-1}"
if [ "$AUTO_PULL" = "1" ] || [ "$AUTO_PULL" = "true" ] || [ "$AUTO_PULL" = "yes" ]; then
  if [ -n "$VERCEL_TOKEN" ] && [ -f /app/apps/app/.vercel/project.json ]; then
    echo "[startup-env] Pulling Vercel env into apps/app/.env.local (non-interactive)"
    cd /app/apps/app

    SCOPE_ARG=""
    if [ -n "$VERCEL_TEAM_ID" ]; then
      SCOPE_ARG="--scope=$VERCEL_TEAM_ID"
    fi

    if vercel env pull ".env.local" --yes --environment=production --token "$VERCEL_TOKEN" $SCOPE_ARG >/tmp/vercel-env-pull.log 2>&1; then
      set -a
      # shellcheck disable=SC1091
      . /app/apps/app/.env.local
      set +a
      echo "[startup-env] Vercel env pull: success"
    else
      echo "[startup-env] Vercel env pull: failed (continuing with existing env)"
      sed -n '1,40p' /tmp/vercel-env-pull.log || true
    fi
    cd /app
  fi
fi

# Run DB migrations when a Postgres URL is set (e.g. in Docker)
if [ -n "$POSTGRES_URL" ] || [ -n "$POSTGRESQL_URL" ] || [ -n "$DATABASE_URL" ]; then
  cd /app/apps/app && bun run db:migrate
fi
exec "$@"
