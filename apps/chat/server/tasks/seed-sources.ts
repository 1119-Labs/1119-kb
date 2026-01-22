import { db, schema } from '@nuxthub/db'

/**
 * Task to seed sources from savoir.config.ts into the database
 *
 * Run with: npx nuxt db seed-sources
 */
export default defineTask({
  meta: {
    name: 'db:seed-sources',
    description: 'Seed sources from savoir.config.ts into the database',
  },
  async run() {
    // Sources extracted from savoir.config.ts
    const githubSources = [
      // Nuxt Core
      { id: 'nuxt', label: 'Nuxt', repo: 'nuxt/nuxt', branch: 'main', contentPath: 'docs', outputPath: 'nuxt' },
      { id: 'nitro', label: 'Nitro', repo: 'nitrojs/nitro', branch: 'main', contentPath: 'docs', outputPath: 'nitro' },

      // Nuxt Modules
      { id: 'nuxt-ui', label: 'Nuxt UI', repo: 'nuxt/ui', branch: 'v4', contentPath: 'docs/content', outputPath: 'nuxt-ui' },
      { id: 'nuxt-hub', label: 'NuxtHub', repo: 'nuxt-hub/core', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-hub' },
      { id: 'nuxt-content', label: 'Nuxt Content', repo: 'nuxt/content', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-content' },
      { id: 'nuxt-image', label: 'Nuxt Image', repo: 'nuxt/image', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-image' },
      { id: 'nuxt-i18n', label: 'Nuxt i18n', repo: 'nuxt-modules/i18n', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-i18n' },
      { id: 'nuxt-scripts', label: 'Nuxt Scripts', repo: 'nuxt/scripts', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-scripts' },
      { id: 'nuxt-fonts', label: 'Nuxt Fonts', repo: 'nuxt/fonts', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-fonts' },
      { id: 'nuxt-eslint', label: 'Nuxt ESLint', repo: 'nuxt/eslint', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-eslint' },
      { id: 'nuxt-devtools', label: 'Nuxt DevTools', repo: 'nuxt/devtools', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-devtools' },
      { id: 'mcp-toolkit', label: 'MCP Toolkit', repo: 'nuxt-modules/mcp-toolkit', branch: 'main', contentPath: 'apps/docs/content', outputPath: 'mcp-toolkit' },
      { id: 'nuxt-studio', label: 'Nuxt Studio', repo: 'nuxt-content/nuxt-studio', branch: 'main', contentPath: 'docs', outputPath: 'nuxt-studio' },

      // README-only
      { id: 'nuxt-icon', label: 'Nuxt Icon', repo: 'nuxt/icon', branch: 'main', readmeOnly: true, outputPath: 'nuxt-icon' },
      { id: 'nuxt-auth-utils', label: 'Nuxt Auth Utils', repo: 'atinux/nuxt-auth-utils', branch: 'main', readmeOnly: true, outputPath: 'nuxt-auth-utils' },
      { id: 'ofetch', label: 'ofetch', repo: 'unjs/ofetch', branch: 'main', readmeOnly: true, outputPath: 'ofetch' },
      { id: 'nuxt-a11y', label: 'Nuxt a11y', repo: 'nuxt/a11y', branch: 'main', readmeOnly: true, outputPath: 'nuxt-a11y' },
      { id: 'nuxt-hints', label: 'Nuxt Hints', repo: 'nuxt/hints', branch: 'main', readmeOnly: true, outputPath: 'nuxt-hints' },

      // UnJS
      { id: 'h3', label: 'H3', repo: 'unjs/h3', branch: 'main', contentPath: 'docs', outputPath: 'h3' },
      { id: 'unstorage', label: 'unstorage', repo: 'unjs/unstorage', branch: 'main', contentPath: 'docs', outputPath: 'unstorage' },
      { id: 'unhead', label: 'Unhead', repo: 'unjs/unhead', branch: 'main', contentPath: 'docs', outputPath: 'unhead' },

      // SEO
      { id: 'nuxt-og-image', label: 'Nuxt OG Image', repo: 'nuxt-modules/og-image', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-og-image' },
      { id: 'nuxt-sitemap', label: 'Nuxt Sitemap', repo: 'nuxt-modules/sitemap', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-sitemap' },
      { id: 'nuxt-robots', label: 'Nuxt Robots', repo: 'nuxt-modules/robots', branch: 'main', contentPath: 'docs/content', outputPath: 'nuxt-robots' },
    ]

    const youtubeSources = [
      { id: 'alex-lichter', label: 'Alexander Lichter', channelId: 'UCqFPgMzGbLjd-MX-h3Z5aQA', handle: '@TheAlexLichter', maxVideos: 100 },
      { id: 'learn-vue', label: 'LearnVue', channelId: 'UCGwuxdEeCf0TIA2RbPOj-8g', handle: '@LearnVue', maxVideos: 50 },
    ]

    console.log('Seeding GitHub sources...')
    for (const source of githubSources) {
      await db.insert(schema.sources).values({
        id: source.id,
        type: 'github',
        label: source.label,
        repo: source.repo,
        branch: source.branch || 'main',
        contentPath: source.contentPath || '',
        outputPath: source.outputPath || source.id,
        readmeOnly: source.readmeOnly || false,
      }).onConflictDoUpdate({
        target: schema.sources.id,
        set: {
          label: source.label,
          repo: source.repo,
          branch: source.branch || 'main',
          contentPath: source.contentPath || '',
          outputPath: source.outputPath || source.id,
          readmeOnly: source.readmeOnly || false,
          updatedAt: new Date(),
        },
      })
      console.log(`  ✓ ${source.id}`)
    }

    console.log('Seeding YouTube sources...')
    for (const source of youtubeSources) {
      await db.insert(schema.sources).values({
        id: source.id,
        type: 'youtube',
        label: source.label,
        channelId: source.channelId,
        handle: source.handle,
        maxVideos: source.maxVideos || 50,
      }).onConflictDoUpdate({
        target: schema.sources.id,
        set: {
          label: source.label,
          channelId: source.channelId,
          handle: source.handle,
          maxVideos: source.maxVideos || 50,
          updatedAt: new Date(),
        },
      })
      console.log(`  ✓ ${source.id}`)
    }

    console.log(`\n✓ Seeded ${githubSources.length} GitHub sources and ${youtubeSources.length} YouTube sources`)

    return { result: 'success' }
  },
})
