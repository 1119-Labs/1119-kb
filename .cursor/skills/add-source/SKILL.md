---
name: add-source
description: Adds a GitHub or YouTube knowledge source via admin UI or API. Use when adding a source, knowledge source, GitHub source, or YouTube source.
---

# Add Source

Guide for adding a new knowledge source to the instance.

## Via Admin UI (recommended)

1. Navigate to `/admin`
2. Click **Add source**
3. Fill in the fields (see tables below)
4. Click **Sync** to pull content into the knowledge base

### GitHub Source

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (e.g. `my-docs`) |
| `label` | Yes | Display name (e.g. `My Docs`) |
| `repo` | Yes | GitHub repository in `owner/repo` format |
| `refType` | No | Clone from: `branch`, `tag`, or `release` (default: `branch`) |
| `branch` | No | Branch name, tag name, or for release: tag (e.g. `v1.0.0`) or `latest` (default: `main`) |
| `contentPath` | No | Path to content directory (default: `docs`) |
| `outputPath` | No | Output directory in snapshot (default: `id`) |
| `readmeOnly` | No | Only fetch README.md (default: `false`) |

### YouTube Source

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier |
| `label` | Yes | Display name |
| `channelId` | Yes | YouTube channel ID (starts with `UC`) |
| `handle` | No | YouTube handle (e.g. `@MyChannel`) |
| `maxVideos` | No | Maximum videos to fetch (default: `50`) |

## Via API

```bash
# Create a GitHub source
curl -X POST <your-url>/api/sources \
  -H "Authorization: Bearer <admin-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-docs",
    "type": "github",
    "label": "My Docs",
    "repo": "org/docs-repo",
    "contentPath": "docs"
  }'

# Trigger sync
curl -X POST <your-url>/api/sync \
  -H "Authorization: Bearer <admin-api-key>"
```

## Notes

- After adding sources, always trigger a **sync** to pull content.
- YouTube sources require `NUXT_YOUTUBE_API_KEY` to be set.
- Sources are stored in SQLite and can be managed from the admin UI at any time.
