import { createLogger } from '@savoir/logger'

/**
 * Initialize the logger when the server starts
 */
export default defineNitroPlugin(() => {
  createLogger({
    env: {
      service: 'savoir',
      environment: process.env.NODE_ENV ?? 'development',
      commitHash: process.env.COMMIT_SHA,
      version: '0.1.0',
    },
  })
})
