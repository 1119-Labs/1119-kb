# Savoir

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
savoir/
├── apps/chat/          # Nuxt app (chat UI + API + bots)
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
