import { z } from 'zod'

const additionalSyncSchema = z.object({
  repo: z.string().min(1),
  branch: z.string().optional(),
  contentPath: z.string().optional(),
})

const gitHubSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'Must be in format owner/repo'),
  branch: z.string().optional(),
  contentPath: z.string().optional(),
  outputPath: z.string().optional(),
  readmeOnly: z.boolean().optional(),
  additionalSyncs: z.array(additionalSyncSchema).optional(),
})

const youTubeSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  channelId: z.string().min(1),
  handle: z.string().optional(),
  maxVideos: z.number().int().positive().optional(),
})

const customSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  fetchFn: z.any(),
})

const savoirConfigSchema = z.object({
  sources: z.object({
    github: z.array(gitHubSourceSchema).optional(),
    youtube: z.array(youTubeSourceSchema).optional(),
    custom: z.array(customSourceSchema).optional(),
  }).optional(),
})

export type ValidatedConfig = z.infer<typeof savoirConfigSchema>

export function validateConfig(config: unknown): ValidatedConfig {
  return savoirConfigSchema.parse(config)
}
