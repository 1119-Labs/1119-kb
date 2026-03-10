// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  telemetry: false,

  extends: ['../../packages/github'],

  modules: [
    '@nuxt/ui',
    '@nuxtjs/mdc',
    '@nuxthub/core',
    '@onmax/nuxt-better-auth',
    'workflow/nuxt',
    '@evlog/nuxthub',
    'nuxt-charts',
  ],

  auth: {
    redirects: {
      login: '/login',
      guest: '/',
    },
    schema: {
      usePlural: false,
      casing: 'camelCase',
    },
  },

  evlog: {
    retention: '7d',
    env: {
      service: '1119labs-kb',
      version: '0.1.0',
    },
    routes: {
      '/api/admin/**': { service: 'admin-api' },
      '/api/webhooks/**': { service: 'webhook-api' },
      '/api/sync/**': { service: 'sync-api' },
      '/api/sandbox/**': { service: 'sandbox-api' },
      '/api/stats/**': { service: 'stats-api' },
    },
    // Disable HTTP access logs in both development and production.
    transport: { enabled: false },
  },

  $production: {
    // sourcemap: {
    //   client: false,
    //   server: false,
    // },
    // vite: {
    //   build: {
    //     sourcemap: false,
    //   },
    // },
    // nitro: {
    //   sourceMap: false,
    // },
    evlog: {
      sampling: {
        rates: {
          debug: 0,
          info: 10,
          warn: 50,
        },
        keep: [
          { status: 400 },
          { duration: 2000 },
          { path: '/api/webhooks/**' },
          { path: '/api/sandbox/**' },
        ],
      },
    },
  },

  devtools: { enabled: false },

  // typescript: {
  //   tsConfig: {
  //     compilerOptions: {
  //       rewriteRelativeImportExtensions: true,
  //     },
  //   },
  // },

  $development: {
    vite: {
      server: {
        allowedHosts: true // Allow ngrok and other tunnels
      }
    },
  },

  css: ['~/assets/css/main.css'],

  mdc: {
    headings: {
      anchorLinks: false
    },
    highlight: {
      shikiEngine: 'javascript'
    }
  },

  experimental: {
    viewTransition: true
  },

  icon: {
    customCollections: [
      {
        prefix: 'custom',
        dir: './app/assets/icons/custom',
      },
    ],
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
    },
    provider: 'iconify',
  },

  compatibilityDate: 'latest',

  nitro: {
    // Silence Nitro request/access logs in both dev and production.
    logLevel: 0,
    experimental: {
      openAPI: false
    },
    typescript: {
      tsConfig: {
        compilerOptions: {
          allowImportingTsExtensions: true,
        },
      },
    },
  },

  hub: {
    // Force postgres-js so we never fall back to PGLite (which fails in Docker: /app/apps/app/.data doesn't exist)
    db: {
      dialect: 'postgresql',
      driver: 'postgres-js',
      applyMigrationsDuringBuild: false, // Docker build has no DATABASE_URL; run migrations at runtime or on startup
    },
    kv: true,
    blob: true,
    cache: true
  },

  routeRules: {
    '/shared/**': { isr: { expiration: 300 } },
    '/api/auth/**': { isr: false, cache: false },
    '/api/chats/**': { isr: false, cache: false },
    '/api/webhooks/**': { isr: false, cache: false },
    '/admin/docs/**': { isr: { expiration: false } },
    '/admin/**': { auth: { user: { role: 'admin' } as any } },
  },

  runtimeConfig: {
    vercelOidcToken: '', // VERCEL_OIDC_TOKEN or NUXT_VERCEL_OIDC_TOKEN — for @vercel/sandbox (Snapshot list, etc.)
    openrouter: {
      apiKey: '',
    },
    github: {
      token: '',
      snapshotRepo: '',
      snapshotBranch: 'main',
      appId: '',
      appPrivateKey: '',
      webhookSecret: '',
      replyToNewIssues: false,
    },
    discord: {
      botToken: '',
      publicKey: '',
      applicationId: '',
      mentionRoleIds: '',
    },
    youtube: {
      apiKey: '',
    },
    public: {
      github: {
        appName: '',
        botTrigger: '',
      },
      discordBotUrl: '',
    },
  }
})
