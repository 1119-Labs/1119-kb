import { defineHandler } from 'nitro/h3'

/**
 * GET /api
 * API health check and information
 */
export default defineHandler(() => {
  return {
    name: 'Savoir API',
    version: '0.1.0',
    endpoints: {
      sources: 'GET /api/sources',
      syncAll: 'POST /api/sync',
      syncOne: 'POST /api/sync/:source',
    },
  }
})
