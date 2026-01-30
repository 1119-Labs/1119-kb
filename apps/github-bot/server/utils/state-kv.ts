/**
 * KVStateAdapter - StateAdapter implementation using NuxtHub KV
 *
 * This adapter demonstrates how to implement chat-sdk's StateAdapter interface
 * using NuxtHub's KV storage instead of Redis.
 *
 * Key prefixes:
 * - chat:sub:{threadId} - Thread subscriptions
 * - chat:lock:{threadId} - Distributed locks
 * - chat:cache:{key} - General cache
 */

import type { Lock, StateAdapter } from 'chat'
import { kv } from 'hub:kv'

export class KVStateAdapter implements StateAdapter {

  private connected = false

  /**
   * Connect to the state backend.
   * For KV, this is a no-op since KV is always available.
   */
  async connect(): Promise<void> {
    this.connected = true
  }

  /**
   * Disconnect from the state backend.
   */
  async disconnect(): Promise<void> {
    this.connected = false
  }

  // =========================================================================
  // Subscriptions
  // =========================================================================

  /**
   * Subscribe to a thread. Subscribed threads will receive all messages
   * via onSubscribedMessage handlers.
   */
  async subscribe(threadId: string): Promise<void> {
    await kv.set(`chat:sub:${threadId}`, true)
  }

  /**
   * Unsubscribe from a thread.
   */
  async unsubscribe(threadId: string): Promise<void> {
    await kv.del(`chat:sub:${threadId}`)
  }

  /**
   * Check if a thread is subscribed.
   */
  async isSubscribed(threadId: string): Promise<boolean> {
    return await kv.has(`chat:sub:${threadId}`)
  }

  /**
   * List all subscriptions, optionally filtered by adapter name.
   */
  async *listSubscriptions(adapterName?: string): AsyncIterable<string> {
    const keys = await kv.keys('chat:sub:')
    for (const key of keys) {
      const threadId = key.replace('chat:sub:', '')
      if (!adapterName || threadId.startsWith(`${adapterName}:`)) {
        yield threadId
      }
    }
  }

  // =========================================================================
  // Distributed Locking
  // =========================================================================

  /**
   * Acquire a lock on a thread. Returns null if already locked.
   * Used to prevent concurrent message processing on the same thread.
   */
  async acquireLock(threadId: string, ttlMs: number): Promise<Lock | null> {
    const key = `chat:lock:${threadId}`
    const existing = await kv.get<Lock>(key)

    // Check if lock exists and hasn't expired
    if (existing && existing.expiresAt > Date.now()) {
      return null
    }

    // Create new lock
    const lock: Lock = {
      threadId,
      token: `kv_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      expiresAt: Date.now() + ttlMs,
    }

    // Store with TTL (NuxtHub KV uses seconds)
    await kv.set(key, lock, { ttl: Math.ceil(ttlMs / 1000) })
    return lock
  }

  /**
   * Release a lock. Only the lock owner (matching token) can release.
   */
  async releaseLock(lock: Lock): Promise<void> {
    const key = `chat:lock:${lock.threadId}`
    const existing = await kv.get<Lock>(key)

    // Only delete if token matches (we own the lock)
    if (existing && existing.token === lock.token) {
      await kv.del(key)
    }
  }

  /**
   * Extend a lock's TTL. Returns false if lock expired or token doesn't match.
   */
  async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
    const key = `chat:lock:${lock.threadId}`
    const existing = await kv.get<Lock>(key)

    if (!existing || existing.token !== lock.token) {
      return false
    }

    if (existing.expiresAt < Date.now()) {
      // Lock has already expired
      await kv.del(key)
      return false
    }

    // Extend the lock
    existing.expiresAt = Date.now() + ttlMs
    await kv.set(key, existing, { ttl: Math.ceil(ttlMs / 1000) })
    return true
  }

  // =========================================================================
  // Cache
  // =========================================================================

  /**
   * Get a cached value by key.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    return await kv.get<T>(`chat:cache:${key}`)
  }

  /**
   * Set a cached value with optional TTL in milliseconds.
   */
  async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    const opts = ttlMs ? { ttl: Math.ceil(ttlMs / 1000) } : undefined
    await kv.set(`chat:cache:${key}`, value, opts)
  }

  /**
   * Delete a cached value.
   */
  async delete(key: string): Promise<void> {
    await kv.del(`chat:cache:${key}`)
  }

}

/**
 * Create a new KVStateAdapter instance.
 */
export function createKVState(): KVStateAdapter {
  return new KVStateAdapter()
}
