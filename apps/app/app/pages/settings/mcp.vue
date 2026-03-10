<script setup lang="ts">
definePageMeta({ auth: 'user' })

useSeoMeta({ title: 'MCP' })

const toast = useToast()
const requestURL = useRequestURL()
const mcpUrl = computed(() => `${requestURL.origin}/api/mcp`)

function copyUrl() {
  navigator.clipboard.writeText(mcpUrl.value)
  toast.add({ title: 'Copied to clipboard', icon: 'i-lucide-check' })
}

interface IntegrationClient {
  id: string
  name: string
  icon: string
  steps: string[]
  alt?: string
  jsonExample?: boolean
  tomlExample?: boolean
}

const integrationSteps: IntegrationClient[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    icon: 'i-lucide-cursor-click',
    steps: [
      'Open Cursor Settings (Cmd + , on macOS, Ctrl + , on Windows).',
      'Go to **Tools & MCP** (or **Features** → **MCP**).',
      'Click **Add new MCP server**.',
      'Set **Type** to **streamableHttp**, **URL** to your endpoint (copy above), and add a header: **Authorization** = **Bearer YOUR_API_KEY** (or use **x-api-key** = **YOUR_API_KEY**).',
      'Save and restart Cursor if needed.',
    ],
    alt: 'Project-specific: add a file .cursor/mcp.json in your repo root with the JSON below.',
    jsonExample: true,
  },
  {
    id: 'codex',
    name: 'Codex',
    icon: 'i-lucide-terminal',
    steps: [
      'Open your Codex config: **~/.codex/config.toml** (or **.codex/config.toml** in a project). In the IDE: MCP settings → Open config.toml.',
      'Add a new **Streamable HTTP** server block (see snippet below).',
      'Set **url** to your MCP endpoint. For auth, either set **bearer_token_env_var** to an env var that holds your API key (e.g. SAVOIR_MCP_API_KEY), or use **http_headers** with **Authorization** = **"Bearer your-key"**.',
      'Restart Codex or reload MCP servers.',
    ],
    tomlExample: true,
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    icon: 'i-lucide-bot',
    steps: [
      'Open **Manage MCP Servers** (e.g. via the "..." menu in the agent panel) and click **View raw config**, or edit the config file directly: **~/.config/antigravity/mcp.json** (Windows: **%APPDATA%\\antigravity\\mcp.json**).',
      'Add an entry under **mcpServers** that points to your MCP URL. If your client supports a remote HTTP server, use the URL and any required auth (see your client’s docs for header/env support).',
      'Save and refresh the MCP list.',
    ],
    jsonExample: true,
  },
]
</script>

<template>
  <div class="px-6 py-8 max-w-2xl mx-auto w-full">
    <header class="mb-8">
      <div class="flex items-center gap-2 mb-1">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="xs"
          to="/settings"
        />
        <h1 class="text-lg font-medium text-highlighted font-pixel tracking-wide">
          MCP
        </h1>
      </div>
      <p class="text-sm text-muted max-w-lg">
        Connect coding agents (Cursor, Claude Code, Antigravity) to your knowledge base via the Model Context Protocol.
      </p>
    </header>

    <div class="space-y-6">
      <section>
        <h2 class="text-[10px] text-muted uppercase tracking-wide mb-3 font-pixel">
          Endpoint
        </h2>
        <div class="rounded-lg border border-default p-4 space-y-2">
          <p class="text-xs text-muted">
            Use this <strong class="text-highlighted">exact</strong> URL in your MCP client (including <code class="bg-elevated px-1 rounded">/api/mcp</code>). Do not use the site root (e.g. <code class="bg-elevated px-1 rounded">https://example.com</code>) or you may see errors like “Page not found: /register”. Authenticate with an API key (see
            <NuxtLink to="/settings/api-keys" class="text-primary hover:underline">
              API Keys
            </NuxtLink>
            ).
          </p>
          <div class="flex items-center gap-2">
            <code class="flex-1 text-xs bg-elevated px-3 py-2 rounded-md font-mono break-all">{{ mcpUrl }}</code>
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="copyUrl"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-[10px] text-muted uppercase tracking-wide mb-3 font-pixel">
          Authentication
        </h2>
        <div class="rounded-lg border border-default divide-y divide-default">
          <div class="px-4 py-3">
            <p class="text-sm text-highlighted mb-1">
              API key required
            </p>
            <p class="text-xs text-muted">
              Send your API key in the request: <code class="bg-elevated px-1.5 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code> or <code class="bg-elevated px-1.5 py-0.5 rounded">x-api-key: &lt;key&gt;</code>. Create keys under
              <NuxtLink to="/settings/api-keys" class="text-primary hover:underline">
                API Keys
              </NuxtLink>.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-[10px] text-muted uppercase tracking-wide mb-3 font-pixel">
          Tools
        </h2>
        <div class="rounded-lg border border-default divide-y divide-default">
          <div class="px-4 py-3">
            <p class="text-sm text-highlighted font-medium mb-0.5">
              listSources
            </p>
            <p class="text-xs text-muted">
              List all knowledge sources with version history (versions sorted by time).
            </p>
          </div>
          <div class="px-4 py-3">
            <p class="text-sm text-highlighted font-medium mb-0.5">
              searchKnowledge
            </p>
            <p class="text-xs text-muted">
              Run a natural language query against the knowledge base; returns a structured answer for the agent loop.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-[10px] text-muted uppercase tracking-wide mb-3 font-pixel">
          Integration guide
        </h2>
        <p class="text-xs text-muted mb-4">
          Add this MCP server to Cursor, Codex, or Antigravity so the agent can list sources and search your knowledge base. Use an API key from
          <NuxtLink to="/settings/api-keys" class="text-primary hover:underline">
            API Keys
          </NuxtLink> for authentication.
        </p>
        <div class="space-y-2">
          <UCollapsible
            v-for="client in integrationSteps"
            :key="client.id"
            class="rounded-lg border border-default overflow-hidden"
          >
            <UButton
              variant="ghost"
              color="neutral"
              class="w-full justify-between px-4 py-3 rounded-none group"
              trailing-icon="i-lucide-chevron-down group-data-[state=open]:rotate-180 transition-transform"
            >
              <span class="flex items-center gap-2">
                <UIcon :name="client.icon" class="size-4 text-highlighted" />
                <span class="text-sm font-medium text-highlighted">{{ client.name }}</span>
              </span>
            </UButton>
            <template #content>
              <div class="px-4 pb-4 pt-0 space-y-3 border-t border-default">
                <ol class="list-decimal list-inside text-xs text-muted space-y-1.5">
                  <li v-for="(step, i) in client.steps" :key="i" class="pl-0.5">
                    <!-- eslint-disable-next-line vue/no-v-html -- steps are static strings; bold only -->
                    <span v-html="step.replace(/\*\*(.+?)\*\*/g, '<strong class=\'text-highlighted\'>$1</strong>')" />
                  </li>
                </ol>
                <p v-if="client.alt" class="text-xs text-muted">
                  {{ client.alt }}
                </p>
                <div v-if="client.jsonExample" class="rounded-md bg-elevated border border-default p-3">
                  <pre class="text-[11px] font-mono text-highlighted whitespace-pre-wrap break-all">{{ `{
  "mcpServers": {
    "knowledge-base": {
      "type": "streamableHttp",
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}` }}</pre>
                  <p class="text-[10px] text-muted mt-2">
                    Replace YOUR_API_KEY with your key. Save as <code class="bg-default px-1 rounded">.cursor/mcp.json</code> (Cursor) or in your Antigravity config.
                  </p>
                </div>
                <div v-if="client.tomlExample" class="rounded-md bg-elevated border border-default p-3">
                  <pre class="text-[11px] font-mono text-highlighted whitespace-pre-wrap break-all">{{ `[mcp_servers.knowledge-base]
url = "${mcpUrl}"
bearer_token_env_var = "SAVOIR_MCP_API_KEY"

# Or use a static header instead:
# http_headers = { "Authorization" = "Bearer your-api-key" }` }}</pre>
                  <p class="text-[10px] text-muted mt-2">
                    Set the env var (e.g. <code class="bg-default px-1 rounded">export SAVOIR_MCP_API_KEY=your-key</code>) or uncomment <code class="bg-default px-1 rounded">http_headers</code> and add your key.
                  </p>
                </div>
              </div>
            </template>
          </UCollapsible>
        </div>
      </section>
    </div>
  </div>
</template>
