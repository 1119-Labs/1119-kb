# GitHub Bot Setup

The Savoir GitHub bot responds to mentions in GitHub issues, using your knowledge base to provide answers directly in the conversation.

## Create a GitHub App

1. Go to **GitHub Settings → Developer settings → GitHub Apps → New GitHub App**
2. Fill in the following:
   - **App name**: e.g. `savoir-bot`
   - **Homepage URL**: your Savoir instance URL
   - **Webhook URL**: `https://savoir.example.com/api/webhooks/github`
   - **Webhook secret**: a random string (save it for later)

### Permissions

Set the following repository permissions:

| Permission | Access |
|------------|--------|
| Issues | Read & Write |
| Metadata | Read-only |

### Events

Subscribe to these events:

- **Issues** — to detect new issues
- **Issue comments** — to detect mentions in comments

## Environment Variables

Add the following to your `.env` file:

| Variable | Description |
|----------|-------------|
| `NUXT_GITHUB_APP_ID` | The App ID from your GitHub App settings |
| `NUXT_GITHUB_APP_PRIVATE_KEY` | The private key (PEM format, can be base64-encoded) |
| `NUXT_GITHUB_WEBHOOK_SECRET` | The webhook secret you set when creating the app |
| `NUXT_SAVOIR_API_KEY` | A Savoir admin API key for the bot to authenticate with |

## Install the App

1. From your GitHub App settings, click **Install App**
2. Select the repositories where the bot should be active
3. Confirm the installation

## Trigger the Bot

Mention the bot in any issue comment:

```
@savoir-bot How do I configure SSO?
```

The bot will:
1. Receive the webhook event
2. Query the Savoir knowledge base
3. Post a reply in the same issue thread

The bot only responds when explicitly mentioned. It ignores its own comments to prevent loops.
