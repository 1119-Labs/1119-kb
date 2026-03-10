# Knowledge Agent Template

AI agents with real-time knowledge base access.

## Quick Reference

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server |
| `bun run build` | Build all packages |
| `bun run test` | Run tests |
| `bun run lint` | Lint all packages |
| `bun run typecheck` | Type check |

## Structure

```
knowledge-agent-template/
├── apps/app/          # Nuxt app (chat UI + API + bots)
│   ├── app/            # Vue components, pages
│   └── server/         # API, workflows, sandbox, bot adapters
└── packages/
    └── sdk/            # @savoir/sdk - AI SDK tools (bash, bash_batch)
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design, API specs, components
- [Sources](docs/SOURCES.md) - Content sources configuration
- [Coding Guidelines](docs/CODING-GUIDELINES.md) - Code style, patterns
- [Environment](docs/ENVIRONMENT.md) - Environment variables
- [Customization](docs/CUSTOMIZATION.md) - How to customize the instance

## Cursor Rules (`.cursor/rules/`)

| Rule | Description |
|------|-------------|
| `general.mdc` | Project description, features, and high-level flows |
| `coding.mdc` | Coding conventions and patches for the tech stack (TS, Vue, Nuxt) |
| `features.mdc` | New feature workflow: plan mode, feature_specs, implementation doc, testing |

## Feature workflow

When implementing a **new feature**:

1. Use **plan mode** first.
2. Create a folder under **`feature_specs/`** (e.g. `feature_specs/my-feature-name/`).
3. Add an implementation doc there with **steps to implement** and **how to test** (automated or manual).
4. Proceed with implementation only after the spec is agreed. See [feature_specs/README.md](feature_specs/README.md) and `.cursor/rules/features.mdc`.

## Cursor Skills (`.cursor/skills/`)

Project skills for the Cursor agent. Use the matching skill when the user asks for the task:

| Skill | Use when |
|-------|----------|
| **add-tool** | Adding a new AI SDK tool or agent tool |
| **add-source** | Adding a knowledge source, GitHub source, or YouTube source |
| **add-bot-adapter** | Adding a bot adapter, new platform (Slack, Linear), or webhook adapter |
| **rename-project** | Renaming the project or rebranding from "Knowledge Agent Template" |

Human-readable guides also live in `.agents/skills/` (add-tool.md, add-source.md, add-bot-adapter.md, rename-project.md).
