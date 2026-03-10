/**
 * For MCP and /register, Cursor (and some clients) expect OAuth-style error bodies
 * with a top-level string "error" field. Without it they show "Invalid OAuth error
 * response: expected string, received undefined". Map status codes to OAuth-style
 * error codes and ensure the response body includes "error".
 */
export function getOAuthStyleErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 429:
      return 'rate_limit_exceeded'
    case 405:
      return 'method_not_allowed'
    case 400:
      return 'bad_request'
    default:
      return 'server_error'
  }
}
