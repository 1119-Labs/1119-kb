---
name: rename-project
description: Renames the project from Knowledge Agent Template to a custom name and updates all references. Use when renaming the project or rebranding.
---

# Rename Project

Guide for fully renaming the project from "Knowledge Agent Template" to a custom name.

## Workflow

1. **Ask the user** for the new name (e.g. "MyDocs") and optionally a new package namespace (e.g. `@mydocs`).
2. **Replace ALL mentions** of "Knowledge Agent Template" across the entire project.
3. **Rename packages** if the user wants a custom namespace.
4. **Run `bun install`** to update the lockfile after package renames.
5. **Run `bun run build`** to verify everything compiles.

## Files to Update

### App branding

- `apps/app/app/app.config.ts` — name, description, icon
- `apps/app/app/assets/icons/custom/savoir.svg` — Replace with custom icon SVG

### Package metadata

- Root `package.json`, `packages/sdk/package.json`, `packages/agent/package.json`, `apps/app/package.json` — name, description, dependency references (`@savoir/agent`, `@savoir/sdk`). Update `package.json` scripts for `--filter=@savoir/*` if namespace changes.

### Source code

- `packages/sdk/src/index.ts`, `packages/sdk/src/client.ts`, `packages/sdk/src/types.ts` — Savoir/createSavoir/SavoirClient/SavoirConfig names and JSDoc
- `packages/agent/src/prompts/chat.ts` — `buildAdminSystemPrompt(appName = 'Knowledge Agent Template')` default
- `apps/app/server/utils/bot/adapters/github.ts`, `apps/app/server/utils/bot/index.ts` — SavoirGitHubAdapter
- `apps/app/server/utils/sandbox/git.ts` — email and bot name

After renaming packages, update **all imports** of `@savoir/sdk` and `@savoir/agent` across `apps/` and `packages/` (grep for `@savoir/`).

### Documentation

- `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `packages/sdk/README.md`, `packages/agent/README.md`
- `docs/ARCHITECTURE.md`, `docs/SOURCES.md`, `docs/ENVIRONMENT.md`, `docs/CUSTOMIZATION.md`
- `apps/app/app/content/docs/*.md` (getting-started, sdk, bot-setup, discord-bot, api-keys, admin-mode)
- `.agents/skills/add-source.md`, `.agents/skills/add-bot-adapter.md` — replace "Knowledge Agent Template instance" / "bot system"

## Find Remaining Mentions

```bash
grep -ri "knowledge agent template\|savoir" --include="*.ts" --include="*.vue" --include="*.md" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.output --exclude-dir=dist --exclude-dir=.nuxt
```

## Checklist

- [ ] app.config.ts — name, description, icon
- [ ] Custom icon SVG
- [ ] All package.json — name, description, dependencies, filter scripts
- [ ] All TypeScript source — class/function names, error messages
- [ ] All @savoir/* imports → new namespace
- [ ] All docs (root, packages/*/README.md, apps/app/app/content/docs/)
- [ ] .agents/skills/ files
- [ ] server/utils/sandbox/git.ts — email and bot name
- [ ] bun install && bun run build
