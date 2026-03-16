import { convertToModelMessages, createUIMessageStream, type UIMessage } from 'ai'
import { db, schema } from '@nuxthub/db'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { createSourceAgent, DEFAULT_MODEL } from '@savoir/agent'
import { createInternalSavoir } from '../bot/savoir'
import { getAgentConfig } from '../agent-config'
import {
  DEFAULT_CONFLICT_MODEL,
  type ConflictRunResult,
  type DetectedConflict,
  type SourceWithLatestVersion,
} from './types'

const MAX_CONFLICTS_PER_PAIR = 5

interface DetectKnowledgeConflictsOptions {
  runId: string
  maxPairs?: number
  model?: string
}

interface ModelConflictPayload {
  conflicts: Array<{
    topic: string
    claimA: string
    claimB: string
    severity: 'high' | 'medium' | 'low'
    confidence: number
    rationale: string
  }>
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function normalizeConflict(input: ModelConflictPayload['conflicts'][number]): DetectedConflict | null {
  const topic = input.topic?.trim()
  const claimA = input.claimA?.trim()
  const claimB = input.claimB?.trim()
  const rationale = input.rationale?.trim()
  if (!topic || !claimA || !claimB || !rationale) return null
  if (!['high', 'medium', 'low'].includes(input.severity)) return null
  return {
    topic,
    claimA,
    claimB,
    severity: input.severity,
    confidence: clampConfidence(Number(input.confidence)),
    rationale,
  }
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch?.[1]) return fenceMatch[1].trim()
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null
  return trimmed.slice(firstBrace, lastBrace + 1)
}

function parseModelConflicts(text: string): DetectedConflict[] {
  const raw = extractJsonObject(text)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as Partial<ModelConflictPayload>
    if (!parsed || !Array.isArray(parsed.conflicts)) return []
    return parsed.conflicts
      .map(normalizeConflict)
      .filter((item): item is DetectedConflict => Boolean(item))
      .slice(0, MAX_CONFLICTS_PER_PAIR)
  } catch {
    return []
  }
}

async function getLatestSourceVersions(): Promise<SourceWithLatestVersion[]> {
  const [allSources, versions] = await Promise.all([
    db.select({
      id: schema.sources.id,
      label: schema.sources.label,
      basePath: schema.sources.basePath,
      outputPath: schema.sources.outputPath,
    }).from(schema.sources),
    db.select({
      id: schema.sourceVersions.id,
      sourceId: schema.sourceVersions.sourceId,
      versionFolderName: schema.sourceVersions.versionFolderName,
      syncedAt: schema.sourceVersions.syncedAt,
    }).from(schema.sourceVersions).orderBy(desc(schema.sourceVersions.syncedAt)),
  ])

  const firstVersionBySource = new Map<string, { id: string; versionFolderName: string; syncedAt: Date }>()
  for (const version of versions) {
    if (!firstVersionBySource.has(version.sourceId)) {
      firstVersionBySource.set(version.sourceId, {
        id: version.id,
        versionFolderName: version.versionFolderName,
        syncedAt: version.syncedAt,
      })
    }
  }

  return allSources
    .map((source): SourceWithLatestVersion | null => {
      const latest = firstVersionBySource.get(source.id)
      if (!latest) return null
      return {
        ...source,
        latestVersion: latest,
      }
    })
    .filter((source): source is SourceWithLatestVersion => Boolean(source))
}

function buildSearchPath(source: SourceWithLatestVersion): string {
  const base = (source.basePath || '/docs').replace(/^\//, '') || 'docs'
  const out = source.outputPath || source.id
  return `${base}/${out}/${source.latestVersion.versionFolderName}`
}

function buildPairPrompt(sourceA: SourceWithLatestVersion, sourceB: SourceWithLatestVersion): string {
  return [
    'Detect knowledge conflicts between these two sources only.',
    `Source A: ${sourceA.label} (${sourceA.id}, version: ${sourceA.latestVersion.versionFolderName})`,
    `Source B: ${sourceB.label} (${sourceB.id}, version: ${sourceB.latestVersion.versionFolderName})`,
    '',
    'Process:',
    '1. Read the two sources in scope.',
    '2. Identify direct contradictions (not merely different coverage).',
    '3. Keep only conflicts with clear textual evidence in both sources.',
    '',
    'Return strict JSON and nothing else in this shape:',
    '{',
    '  "conflicts": [',
    '    {',
    '      "topic": "short topic label",',
    '      "claimA": "claim from source A",',
    '      "claimB": "conflicting claim from source B",',
    '      "severity": "high|medium|low",',
    '      "confidence": 0.0,',
    '      "rationale": "why these claims conflict"',
    '    }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- If there are no conflicts, return {"conflicts": []}.',
    '- confidence must be between 0 and 1.',
    '- claimA and claimB must be concise and factual.',
    '- Do not include markdown fences.',
  ].join('\n')
}

async function runAgentForPair(
  sourceA: SourceWithLatestVersion,
  sourceB: SourceWithLatestVersion,
  model: string,
  savoir: ReturnType<typeof createInternalSavoir>,
): Promise<DetectedConflict[]> {
  const requestId = `conflict_${crypto.randomUUID().slice(0, 8)}`
  const messages: UIMessage[] = [
    {
      id: crypto.randomUUID(),
      role: 'user',
      parts: [{ type: 'text', text: buildPairPrompt(sourceA, sourceB) }],
    },
  ]

  const searchPaths = [buildSearchPath(sourceA), buildSearchPath(sourceB)]

  const agent = createSourceAgent({
    tools: savoir.tools,
    getAgentConfig,
    messages,
    defaultModel: DEFAULT_MODEL,
    requestId,
    searchPaths,
  })

  let resolved = false
  const resultPromise = new Promise<UIMessage[]>((resolve) => {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = await agent.stream({
          messages: await convertToModelMessages(messages),
          options: { model },
        })
        writer.merge(result.toUIMessageStream())
      },
      onFinish: ({ messages: responseMessages }) => {
        if (resolved) return
        resolved = true
        resolve(responseMessages)
      },
    })

    const reader = stream.getReader()
    const consume = async () => {
      try {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      } catch {
        if (!resolved) {
          resolved = true
          resolve([])
        }
      }
    }
    void consume()
  })

  const responseMessages = await resultPromise
  const lastAssistant = responseMessages.filter(message => message.role === 'assistant').pop()
  if (!lastAssistant?.parts) return []

  let answer = ''
  for (const part of lastAssistant.parts as Array<{ type?: string; text?: string }>) {
    if (part?.type === 'text' && typeof part.text === 'string') answer += part.text
  }
  return parseModelConflicts(answer)
}

export async function detectKnowledgeConflicts(options: DetectKnowledgeConflictsOptions): Promise<ConflictRunResult> {
  const model = options.model || DEFAULT_CONFLICT_MODEL
  const sources = await getLatestSourceVersions()

  await db
    .update(schema.knowledgeConflictRuns)
    .set({
      status: 'running',
      sourceCount: sources.length,
      model,
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.knowledgeConflictRuns.id, options.runId))

  if (sources.length < 2) {
    await db
      .update(schema.knowledgeConflictRuns)
      .set({
        status: 'completed',
        checkedPairs: 0,
        sourceCount: sources.length,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.knowledgeConflictRuns.id, options.runId))

    return { checkedPairs: 0, sourceCount: sources.length, conflictCount: 0 }
  }

  const pairs: Array<[SourceWithLatestVersion, SourceWithLatestVersion]> = []
  for (let i = 0; i < sources.length; i += 1) {
    for (let j = i + 1; j < sources.length; j += 1) {
      const left = sources[i]
      const right = sources[j]
      if (!left || !right) continue
      pairs.push([left, right])
    }
  }

  const boundedPairs = options.maxPairs && options.maxPairs > 0 ? pairs.slice(0, options.maxPairs) : pairs
  const savoir = createInternalSavoir({
    source: 'knowledge-conflicts',
    sourceId: options.runId,
  })

  let checkedPairs = 0
  let insertedConflicts = 0
  for (const [sourceA, sourceB] of boundedPairs) {
    const conflicts = await runAgentForPair(sourceA, sourceB, model, savoir)
    checkedPairs += 1

    await db
      .update(schema.knowledgeConflictRuns)
      .set({ checkedPairs, updatedAt: new Date() })
      .where(eq(schema.knowledgeConflictRuns.id, options.runId))

    if (conflicts.length) {
      await db.insert(schema.knowledgeConflicts).values(conflicts.map(conflict => ({
        runId: options.runId,
        topic: conflict.topic,
        claimA: conflict.claimA,
        claimB: conflict.claimB,
        sourceAId: sourceA.id,
        sourceAVersionId: sourceA.latestVersion.id,
        sourceBId: sourceB.id,
        sourceBVersionId: sourceB.latestVersion.id,
        severity: conflict.severity,
        confidence: conflict.confidence,
        rationale: conflict.rationale,
        status: 'open' as const,
        updatedAt: new Date(),
      })))
      insertedConflicts += conflicts.length
    }
  }

  await db
    .update(schema.knowledgeConflictRuns)
    .set({
      status: 'completed',
      checkedPairs,
      sourceCount: sources.length,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.knowledgeConflictRuns.id, options.runId))

  return {
    checkedPairs,
    sourceCount: sources.length,
    conflictCount: insertedConflicts,
  }
}

export async function markConflictRunFailed(runId: string, error: string): Promise<void> {
  await db
    .update(schema.knowledgeConflictRuns)
    .set({
      status: 'failed',
      error,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.knowledgeConflictRuns.id, runId))
}

export async function buildConflictSummary(runId: string): Promise<{ open: number; high: number; medium: number; low: number }> {
  const rows = await db
    .select({
      severity: schema.knowledgeConflicts.severity,
      status: schema.knowledgeConflicts.status,
    })
    .from(schema.knowledgeConflicts)
    .where(eq(schema.knowledgeConflicts.runId, runId))

  return rows.reduce(
    (acc, row) => {
      if (row.status === 'open') acc.open += 1
      if (row.severity === 'high') acc.high += 1
      if (row.severity === 'medium') acc.medium += 1
      if (row.severity === 'low') acc.low += 1
      return acc
    },
    { open: 0, high: 0, medium: 0, low: 0 },
  )
}

export async function getLatestRunWithConflicts(limit: number = 50) {
  const run = await db.query.knowledgeConflictRuns.findFirst({
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.createdAt)],
  })

  if (!run) return { run: null, conflicts: [], summary: { open: 0, high: 0, medium: 0, low: 0 } }

  const conflicts = await db.query.knowledgeConflicts.findMany({
    where: () => eq(schema.knowledgeConflicts.runId, run.id),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.confidence), orderDesc(table.createdAt)],
    limit,
  })
  const summary = await buildConflictSummary(run.id)
  return { run, conflicts, summary }
}

export async function getConflictDetails(conflictId: string) {
  const conflict = await db.query.knowledgeConflicts.findFirst({
    where: () => eq(schema.knowledgeConflicts.id, conflictId),
  })
  if (!conflict) return null

  const [sourceRows, versionRows] = await Promise.all([
    db
      .select({ id: schema.sources.id, label: schema.sources.label, type: schema.sources.type })
      .from(schema.sources)
      .where(inArray(schema.sources.id, [conflict.sourceAId, conflict.sourceBId])),
    db
      .select({ id: schema.sourceVersions.id, versionFolderName: schema.sourceVersions.versionFolderName, syncedAt: schema.sourceVersions.syncedAt })
      .from(schema.sourceVersions)
      .where(inArray(schema.sourceVersions.id, [conflict.sourceAVersionId, conflict.sourceBVersionId])),
  ])

  const sourceMap = new Map(sourceRows.map(row => [row.id, row]))
  const versionMap = new Map(versionRows.map(row => [row.id, row]))

  return {
    ...conflict,
    sourceA: sourceMap.get(conflict.sourceAId) ?? null,
    sourceB: sourceMap.get(conflict.sourceBId) ?? null,
    sourceAVersion: versionMap.get(conflict.sourceAVersionId) ?? null,
    sourceBVersion: versionMap.get(conflict.sourceBVersionId) ?? null,
  }
}

export async function updateConflictStatus(conflictId: string, status: 'acknowledged' | 'resolved') {
  const [updated] = await db
    .update(schema.knowledgeConflicts)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.knowledgeConflicts.id, conflictId),
        inArray(schema.knowledgeConflicts.status, ['open', 'acknowledged', 'resolved']),
      ),
    )
    .returning()

  return updated ?? null
}
