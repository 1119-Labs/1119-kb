# Rename Project

Guide for fully renaming the project from "Savoir" to a custom name.

## Workflow

When the user wants to rename the project:

1. **Ask the user** for the new name (e.g. "MyDocs") and optionally a new package namespace (e.g. `@mydocs`)
2. **Replace ALL mentions** of "Savoir" across the entire project
3. **Rename packages** if the user wants a custom namespace
4. **Run `bun install`** to update the lockfile after package renames

## Complete List of Files to Update

### App Branding (UI-facing)

| File | What to change |
|------|---------------|
| `apps/chat/app/app.config.ts` | `name: 'Savoir'` → new name, update `description`, update `icon` |
| `apps/chat/app/assets/icons/custom/savoir.svg` | Replace with custom icon SVG, rename the file |

### Package Metadata

| File | What to change |
|------|---------------|
| `package.json` | `"name"`, `"description": "Monorepo for Savoir"` |
| `packages/sdk/package.json` | `"name"`, `"description"`, `"repository.url"`, `"homepage"` |
| `packages/agent/package.json` | `"name"`, `"description"` |
| `apps/chat/package.json` | `"name"`, dependency references `@savoir/agent`, `@savoir/sdk` |

### Source Code

| File | What to change |
|------|---------------|
| `packages/sdk/src/index.ts` | `Savoir` interface name, `createSavoir` function name |
| `packages/sdk/src/client.ts` | `SavoirClient` class name, error messages mentioning "Savoir" |
| `packages/sdk/src/types.ts` | `SavoirConfig` type name, JSDoc comments |
| `packages/agent/src/prompts/chat.ts` | `buildAdminSystemPrompt(appName = 'Savoir')` default value |
| `apps/chat/server/utils/bot/adapters/github.ts` | `SavoirGitHubAdapter` class name |
| `apps/chat/server/utils/bot/index.ts` | `SavoirGitHubAdapter` import and usage |
| `apps/chat/server/utils/sandbox/git.ts` | `email: 'bot@savoir.dev'`, `name: 'Savoir Bot'` |

After renaming packages, update **all imports** across the codebase:

```bash
# Find all files importing @savoir/*
grep -rl "@savoir/sdk" apps/ packages/ --include="*.ts" --include="*.vue"
grep -rl "@savoir/agent" apps/ packages/ --include="*.ts" --include="*.vue"
```

Also check `package.json` scripts for `--filter=@savoir/*` references.

### Documentation

| File | What to change |
|------|---------------|
| `README.md` | Title, all mentions of "Savoir" |
| `CONTRIBUTING.md` | Title, all mentions of "Savoir" |
| `AGENTS.md` | Title |
| `packages/sdk/README.md` | All mentions of "Savoir", `createSavoir`, `SavoirClient`, etc. |
| `packages/agent/README.md` | All mentions of "Savoir" |
| `docs/ARCHITECTURE.md` | All mentions of "Savoir" |
| `docs/SOURCES.md` | All mentions of "Savoir" |
| `docs/ENVIRONMENT.md` | All mentions of "Savoir", `SAVOIR_API_URL`, `SAVOIR_API_KEY` |
| `docs/CUSTOMIZATION.md` | All mentions of "Savoir" |

### In-App Documentation

| File | What to change |
|------|---------------|
| `apps/chat/app/content/docs/getting-started.md` | All mentions of "Savoir" |
| `apps/chat/app/content/docs/sdk.md` | All mentions of "Savoir" |
| `apps/chat/app/content/docs/bot-setup.md` | "Savoir GitHub bot", "Savoir knowledge base" |
| `apps/chat/app/content/docs/discord-bot.md` | "Savoir Discord bot" |
| `apps/chat/app/content/docs/api-keys.md` | "authenticate with Savoir" |
| `apps/chat/app/content/docs/admin-mode.md` | "Savoir uses" |

### Skills

| File | What to change |
|------|---------------|
| `agents/skills/add-source.md` | "Savoir instance" |
| `agents/skills/add-bot-adapter.md` | "Savoir bot system" |

## Quick Find & Replace

To find all remaining mentions after manual updates:

```bash
grep -ri "savoir" --include="*.ts" --include="*.vue" --include="*.md" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.output --exclude-dir=dist --exclude-dir=.nuxt
```

## Checklist

- [ ] `app.config.ts` — name, description, icon
- [ ] Custom icon SVG
- [ ] All `package.json` files — name, description, dependencies
- [ ] All TypeScript source — class names, function names, error messages
- [ ] All `@savoir/*` imports → new namespace
- [ ] All documentation files (root `docs/`, `packages/*/README.md`)
- [ ] All in-app docs (`apps/chat/app/content/docs/`)
- [ ] All skill files (`agents/skills/`)
- [ ] Git config (`server/utils/sandbox/git.ts`) — email and bot name
- [ ] Run `bun install` to update lockfile
- [ ] Run `bun run build` to verify everything compiles
