import type { chats, messages } from '@nuxthub/db/schema'

export type Chat = typeof chats.$inferSelect
export type Message = typeof messages.$inferSelect
