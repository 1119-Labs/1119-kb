/**
 * Step: Update sync request status
 *
 * Persists sync workflow lifecycle updates to sync_requests.
 */

import { log } from 'evlog'
import { eq } from 'drizzle-orm'
import { db } from '@nuxthub/db'
import type { SyncSummary } from '../types'
import { syncRequests } from '../../../db/schema'

export async function stepMarkSyncRequestSuccess(
  syncRequestId: string,
  sourceCount: number,
  summary: SyncSummary,
): Promise<void> {
  'use step'

  const stepId = 'stepMarkSyncRequestSuccess'
  await db
    .update(syncRequests)
    .set({
      status: 'success',
      summary,
      error: null,
      sourceCount,
      updatedAt: new Date(),
    })
    .where(eq(syncRequests.id, syncRequestId))

  log.info('sync', `[${stepId}] Marked sync request ${syncRequestId} as success`)
}

export async function stepMarkSyncRequestFailed(
  syncRequestId: string,
  errorMessage: string,
): Promise<void> {
  'use step'

  const stepId = 'stepMarkSyncRequestFailed'
  await db
    .update(syncRequests)
    .set({
      status: 'failed',
      error: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(syncRequests.id, syncRequestId))

  log.warn('sync', `[${stepId}] Marked sync request ${syncRequestId} as failed`)
}
