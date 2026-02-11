# API Keys

API keys allow external services to authenticate with Savoir without a browser session. They use Better Auth's API key plugin to create a virtual session tied to the key owner.

## Admin Keys

Admin keys have full access to all endpoints, including admin-only routes.

1. Navigate to **Admin → API Keys**
2. Click **Create API Key**
3. Copy the key immediately — it won't be shown again

## User Keys

Regular users can create keys scoped to their own permissions.

1. Navigate to **Settings → API Keys**
2. Click **Create API Key**
3. Copy the key immediately

## Usage

Include the key in your requests using either header:

```bash
# Authorization header
curl -H "Authorization: Bearer sk_live_..." https://savoir.example.com/api/chat

# x-api-key header
curl -H "x-api-key: sk_live_..." https://savoir.example.com/api/chat
```

Both headers are equivalent. Use whichever fits your HTTP client best.

## Rotation & Revocation

- To **revoke** a key, click the delete button next to it in the API Keys page
- To **rotate** a key, create a new one, update your services, then revoke the old key
- Revoked keys are immediately invalidated — in-flight requests using a revoked key will fail
