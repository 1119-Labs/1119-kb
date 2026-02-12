import { z } from 'zod'
import { useLogger } from 'evlog'
import { getOrCreateSandbox } from '../../utils/sandbox/manager'

const bodySchema = z.object({
  command: z.string().min(1).max(2000).optional(),
  commands: z.array(z.string().min(1).max(2000)).max(10).optional(),
  sessionId: z.string().optional(),
}).refine(
  data => (data.command && !data.commands) || (!data.command && data.commands),
  { message: 'Provide either "command" or "commands", not both' },
)

const ALLOWED_COMMANDS = new Set([
  // File discovery
  'find',
  'ls',
  'tree',
  // Content search
  'grep',
  'egrep',
  'fgrep',
  // File reading
  'cat',
  'head',
  'tail',
  'less',
  'more',
  // Text processing (output filtering)
  'wc',
  'sort',
  'uniq',
  'cut',
  'awk',
  'sed',
  'tr',
  'column',
  // Utilities
  'echo',
  'printf',
  'test',
  '[',
  'true',
  'false',
  'basename',
  'dirname',
  'realpath',
  'file',
  'stat',
  'du',
  'diff',
  'comm',
  'xargs',
  'tee',
  // String/path helpers
  'md5sum',
  'sha256sum',
])

const BLOCKED_SHELL_PATTERNS = [
  /\$\(/, // command substitution $(...)
  /`[^`]+`/, // backtick substitution
  /\beval\b/, // eval
  /\bexec\b/, // exec
  /\bsource\b/, // source
  /\bbash\b/, // nested bash
  /\bsh\b/, // nested sh
  /\bzsh\b/, // nested zsh
  /\benv\b/, // env (can run arbitrary commands)
  />\s*[^\s|]/, // write redirection (> file)
  /\bpython\b/, // interpreter
  /\bnode\b/, // interpreter
  /\bperl\b/, // interpreter
  /\bruby\b/, // interpreter
]

const MAX_OUTPUT = 50000

function validateCommand(command: string): void {
  for (const pattern of BLOCKED_SHELL_PATTERNS) {
    if (pattern.test(command)) {
      throw createError({
        statusCode: 400,
        message: `Command contains blocked pattern: ${command.slice(0, 50)}`,
      })
    }
  }

  // Split by pipe, &&, ||, ; to get individual command segments
  const segments = command.split(/\s*(?:\|(?!\|)|\|\||&&|;)\s*/)
  for (const segment of segments) {
    const trimmed = segment.trim()
    if (!trimmed) continue
    // Extract the command name (first word, ignoring env-style VAR=val prefixes)
    const words = trimmed.split(/\s+/)
    const cmdName = words.find(w => !w.includes('=')) || words[0]!
    if (!ALLOWED_COMMANDS.has(cmdName)) {
      throw createError({
        statusCode: 400,
        message: `Command not allowed: ${cmdName}`,
      })
    }
  }
}

function truncateOutput(output: string): string {
  if (output.length > MAX_OUTPUT) {
    return `${output.slice(0, MAX_OUTPUT)}\n... (truncated, ${output.length} total chars)`
  }
  return output
}

interface CommandResult {
  command: string
  stdout: string
  stderr: string
  exitCode: number
  execMs: number
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const requestLog = useLogger(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const commands = body.commands || [body.command!]

  for (const cmd of commands) {
    validateCommand(cmd)
  }

  const isBatch = commands.length > 1
  requestLog.set({ commandCount: commands.length, isBatch })

  const sandboxStart = Date.now()
  const { sandbox, sessionId } = await getOrCreateSandbox(body.sessionId)
  requestLog.set({ sandboxMs: Date.now() - sandboxStart, sandboxId: sandbox.sandboxId, sessionId })

  const results: CommandResult[] = []

  for (const command of commands) {
    const execStart = Date.now()
    const result = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', command],
      cwd: '/vercel/sandbox',
    })

    results.push({
      command,
      stdout: truncateOutput(await result.stdout()),
      stderr: truncateOutput(await result.stderr()),
      exitCode: result.exitCode,
      execMs: Date.now() - execStart,
    })
  }

  requestLog.set({ totalExecMs: results.reduce((sum, r) => sum + r.execMs, 0), commandsExecuted: results.length })

  if (!isBatch) {
    const r = results[0]!
    return { sessionId, stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode }
  }

  return {
    sessionId,
    results: results.map(r => ({
      command: r.command,
      stdout: r.stdout,
      stderr: r.stderr,
      exitCode: r.exitCode,
    })),
  }
})
