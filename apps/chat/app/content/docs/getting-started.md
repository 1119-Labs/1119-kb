# Getting Started

## Prerequisites

- **Node.js** v20 or later
- **pnpm** v9 or later

## Environment Variables

Create a `.env` file at the project root with the following variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `BETTER_AUTH_SECRET` | Secret used to sign sessions and tokens | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret | Yes |
| `NUXT_ADMIN_USERS` | Comma-separated list of admin email addresses | Yes |
| `NUXT_PUBLIC_SITE_URL` | Public URL of your Savoir instance (e.g. `https://savoir.example.com`) | Yes |
| `DATABASE_URL` | Database connection string | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI models | Yes |

## First Launch

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`. Sign in with one of the admin emails to access the admin panel.

## Adding Sources

Sources are the knowledge base that Savoir uses to answer questions.

1. Navigate to **Admin → Sources**
2. Click **Add source** and provide a name and URL
3. Click **Sync** to index the source content

Savoir will crawl the source and chunk it into embeddings. Subsequent syncs only process changed content.
