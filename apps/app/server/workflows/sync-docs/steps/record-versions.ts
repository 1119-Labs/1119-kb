/**
 * Step: Record source versions
 *
 * Upserts synced GitHub source versions into source_versions table.
 */

import { getStepMetadata } from 'workflow'
import { log } from 'evlog'
import { db, schema } from '@nuxthub/db'
import type { SyncSourceResult } from '../types'

export async function stepRecordVersions(results: SyncSourceResult[]): Promise<void> {
  'use step'

  const { stepId } = getStepMetadata()

  for (const r of results) {
    if (!r.success || !r.versionFolderName || !r.refType || r.ref === undefined)
      continue

    try {
      await db
        .insert(schema.sourceVersions)
        .values({
          sourceId: r.sourceId,
          versionFolderName: r.versionFolderName,
          refType: r.refType,
          ref: r.ref,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.sourceVersions.sourceId, schema.sourceVersions.versionFolderName],
          set: {
            refType: r.refType,
            ref: r.ref,
            syncedAt: new Date(),
          },
        })
      log.info('sync', `[${stepId}] Recorded version ${r.versionFolderName} for source ${r.sourceId}`)
    } catch (err) {
      log.warn('sync', `[${stepId}] Failed to record version for ${r.sourceId}: ${(err as Error).message}`)
    }
  }
}
