declare module '@modelcontextprotocol/sdk/server/mcp' {
  export class McpServer {

    constructor(serverInfo: { name: string; version: string }, options?: { capabilities?: Record<string, unknown> })
    registerTool(
      name: string,
      config: { description: string; inputSchema?: Record<string, unknown> },
      handler: (args: unknown, extra?: unknown) => Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>,
    ): void
    connect(transport: unknown): Promise<void>
    close(): Promise<void>
  
  }
}

declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export * from '@modelcontextprotocol/sdk/server/mcp'
}

declare module '@modelcontextprotocol/sdk/server/streamableHttp' {
  export class StreamableHTTPServerTransport {

    constructor(options?: { sessionIdGenerator?: (() => string) | undefined })
    handleRequest(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, parsedBody?: unknown): Promise<void>
    close(): Promise<void>
  
  }
}

declare module '@modelcontextprotocol/sdk/server/streamableHttp.js' {
  export * from '@modelcontextprotocol/sdk/server/streamableHttp'
}
