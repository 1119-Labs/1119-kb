import { kv } from '@nuxthub/kv'
import type { SnapshotMetadata } from './types'
import { KV_KEYS } from './types'

/**
 * Get the current snapshot metadata from KV storage
 */
export async function getCurrentSnapshot(): Promise<SnapshotMetadata | null> {
  return await kv.get<SnapshotMetadata>(KV_KEYS.CURRENT_SNAPSHOT)
}

/**
 * Set the current snapshot metadata in KV storage
 */
export async function setCurrentSnapshot(metadata: SnapshotMetadata): Promise<void> {
  await kv.set(KV_KEYS.CURRENT_SNAPSHOT, metadata)
}

/**
 * Check if a snapshot exists
 */
export async function hasSnapshot(): Promise<boolean> {
  const snapshot = await getCurrentSnapshot()
  return snapshot !== null
}

/**
 * Get snapshot ID or throw if none exists
 */
export async function getSnapshotIdOrThrow(): Promise<string> {
  const snapshot = await getCurrentSnapshot()
  if (!snapshot) {
    throw new Error('No snapshot available. Please create a snapshot first.')
  }
  return snapshot.snapshotId
}
