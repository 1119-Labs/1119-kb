import { z } from 'zod'
import type { H3Event } from 'h3'
import { getSourcesWithVersions } from './list-sources'
import { runSearchKnowledge } from './search-knowledge'

/**
 * Create an MCP server with listSources and searchKnowledge tools,
 * and handle an incoming request (Node req/res + parsed body).
 * Caller must have already validated auth (e.g. requireUserSession).
 */
export async function handleMcpRequest(
  event: H3Event,
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  parsedBody: unknown,
): Promise<void> {
  const [{ McpServer: MCP_SERVER }, { StreamableHTTPServerTransport: STREAMABLE_HTTP_SERVER_TRANSPORT }] = await Promise.all([
    import('@modelcontextprotocol/sdk/server/mcp.js'),
    import('@modelcontextprotocol/sdk/server/streamableHttp.js'),
  ])

  const server = new MCP_SERVER(
    {
      name: 'savoir-knowledge',
      version: '1.0.0',
    },
    { capabilities: {} },
  )

  server.registerTool(
    'listSources',
    {
      description: 'List all configured knowledge sources with their versioning history. Each source includes a versions array sorted by sync time (newest first).',
      inputSchema: {},
    },
    async () => {
      const data = await getSourcesWithVersions()
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      }
    },
  )

  server.registerTool(
    'searchKnowledge',
    {
      description: 'Search the knowledge base with a natural language query. Returns a structured answer suitable for coding agents to use in their loop. Uses the same search pipeline as the chat feature.',
      inputSchema: {
        query: z.string().describe('Natural language search query'),
        sourceVersions: z
          .record(z.string(), z.string())
          .optional()
          .describe('Optional map of source id to version folder name to pin versions'),
      },
    },
    async (args: unknown) => {
      const a = args as { query?: string; sourceVersions?: Record<string, string> }
      const query = typeof a?.query === 'string' ? a.query : ''
      const sourceVersions =
        a && typeof a.sourceVersions === 'object' && a.sourceVersions !== null ? a.sourceVersions : undefined
      if (!query.trim()) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ answer: '', error: 'query is required' }) }],
          isError: true as const,
        }
      }
      const result = await runSearchKnowledge(event, query.trim(), sourceVersions)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result),
          },
        ],
      }
    },
  )

  const transport = new STREAMABLE_HTTP_SERVER_TRANSPORT({
    sessionIdGenerator: undefined,
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, parsedBody)
  res.on('close', () => {
    transport.close()
    server.close()
  })
}
