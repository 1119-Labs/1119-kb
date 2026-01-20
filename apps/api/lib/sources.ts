import type { GitHubSource, YouTubeSource, Source } from './types'

export const GITHUB_SOURCES: GitHubSource[] = [
  // Nuxt Core
  {
    id: 'nuxt',
    label: 'Nuxt',
    type: 'github',
    repo: 'nuxt/nuxt',
    branch: 'main',
    contentPath: 'docs',
    outputPath: 'nuxt',
    additionalSyncs: [
      { repo: 'nuxt/nuxt.com', branch: 'main', contentPath: 'content' },
    ],
  },
  {
    id: 'nitro',
    label: 'Nitro',
    type: 'github',
    repo: 'nitrojs/nitro',
    branch: 'v3',
    contentPath: 'docs',
    outputPath: 'nitro',
  },

  // Nuxt Modules
  {
    id: 'nuxt-ui',
    label: 'Nuxt UI',
    type: 'github',
    repo: 'nuxt/ui',
    branch: 'v4',
    contentPath: 'docs/content',
    outputPath: 'nuxt-ui',
  },
  {
    id: 'nuxt-hub',
    label: 'NuxtHub',
    type: 'github',
    repo: 'nuxt-hub/core',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-hub',
  },
  {
    id: 'nuxt-content',
    label: 'Nuxt Content',
    type: 'github',
    repo: 'nuxt/content',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-content',
  },
  {
    id: 'nuxt-image',
    label: 'Nuxt Image',
    type: 'github',
    repo: 'nuxt/image',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-image',
  },
  {
    id: 'nuxt-i18n',
    label: 'Nuxt i18n',
    type: 'github',
    repo: 'nuxt-modules/i18n',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-i18n',
  },
  {
    id: 'nuxt-scripts',
    label: 'Nuxt Scripts',
    type: 'github',
    repo: 'nuxt/scripts',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-scripts',
  },
  {
    id: 'nuxt-fonts',
    label: 'Nuxt Fonts',
    type: 'github',
    repo: 'nuxt/fonts',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-fonts',
  },
  {
    id: 'nuxt-eslint',
    label: 'Nuxt ESLint',
    type: 'github',
    repo: 'nuxt/eslint',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-eslint',
  },
  {
    id: 'nuxt-devtools',
    label: 'Nuxt DevTools',
    type: 'github',
    repo: 'nuxt/devtools',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-devtools',
  },

  // README-only
  {
    id: 'nuxt-icon',
    label: 'Nuxt Icon',
    type: 'github',
    repo: 'nuxt/icon',
    branch: 'main',
    contentPath: '',
    outputPath: 'nuxt-icon',
    readmeOnly: true,
  },
  {
    id: 'nuxt-auth-utils',
    label: 'Nuxt Auth Utils',
    type: 'github',
    repo: 'atinux/nuxt-auth-utils',
    branch: 'main',
    contentPath: '',
    outputPath: 'nuxt-auth-utils',
    readmeOnly: true,
  },
  {
    id: 'ofetch',
    label: 'ofetch',
    type: 'github',
    repo: 'unjs/ofetch',
    branch: 'main',
    contentPath: '',
    outputPath: 'ofetch',
    readmeOnly: true,
  },

  // UnJS
  {
    id: 'h3',
    label: 'H3',
    type: 'github',
    repo: 'unjs/h3',
    branch: 'main',
    contentPath: 'docs',
    outputPath: 'h3',
  },
  {
    id: 'unstorage',
    label: 'unstorage',
    type: 'github',
    repo: 'unjs/unstorage',
    branch: 'main',
    contentPath: 'docs',
    outputPath: 'unstorage',
  },
  {
    id: 'unhead',
    label: 'Unhead',
    type: 'github',
    repo: 'unjs/unhead',
    branch: 'main',
    contentPath: 'docs',
    outputPath: 'unhead',
  },

  // SEO
  {
    id: 'nuxt-og-image',
    label: 'Nuxt OG Image',
    type: 'github',
    repo: 'nuxt-modules/og-image',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-og-image',
  },
  {
    id: 'nuxt-sitemap',
    label: 'Nuxt Sitemap',
    type: 'github',
    repo: 'nuxt-modules/sitemap',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-sitemap',
  },
  {
    id: 'nuxt-robots',
    label: 'Nuxt Robots',
    type: 'github',
    repo: 'nuxt-modules/robots',
    branch: 'main',
    contentPath: 'docs/content',
    outputPath: 'nuxt-robots',
  },

  // Other
  {
    id: 'mcp-toolkit',
    label: 'MCP Toolkit',
    type: 'github',
    repo: 'nuxt-modules/mcp-toolkit',
    branch: 'main',
    contentPath: 'apps/docs/content',
    outputPath: 'mcp-toolkit',
  },
  {
    id: 'nuxt-studio',
    label: 'Nuxt Studio',
    type: 'github',
    repo: 'nuxt-content/nuxt-studio',
    branch: 'main',
    contentPath: 'docs',
    outputPath: 'nuxt-studio',
  },
]

export const YOUTUBE_SOURCES: YouTubeSource[] = [
  {
    id: 'alex-lichter',
    label: 'Alexander Lichter',
    type: 'youtube',
    channelId: 'UCqFPgMzGbLjd-MX-h3Z5aQA',
    handle: '@TheAlexLichter',
    maxVideos: 100,
  },
  {
    id: 'learn-vue',
    label: 'LearnVue',
    type: 'youtube',
    channelId: 'UCGwuxdEeCf0TIA2RbPOj-8g',
    handle: '@LearnVue',
    maxVideos: 50,
  },
]

export const SOURCES: Source[] = [...GITHUB_SOURCES, ...YOUTUBE_SOURCES]

export function getSourceById(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id)
}

export function getGitHubSources(): GitHubSource[] {
  return GITHUB_SOURCES
}

export function getYouTubeSources(): YouTubeSource[] {
  return YOUTUBE_SOURCES
}

export function getSourcesByType<T extends Source['type']>(
  type: T
): Extract<Source, { type: T }>[] {
  return SOURCES.filter((s) => s.type === type) as Extract<Source, { type: T }>[]
}
