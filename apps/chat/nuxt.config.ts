// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/mdc',
    '@nuxthub/core',
    'nuxt-auth-utils'
  ],

  devtools: { enabled: true },

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

  compatibilityDate: 'latest',

  nitro: {
    experimental: {
      openAPI: true
    }
  },

  hub: {
    db: 'sqlite',
    kv: true,
    blob: true
  },

  runtimeConfig: {
    githubToken: process.env.GITHUB_TOKEN || '',
    githubAppId: process.env.GITHUB_APP_ID || '',
    githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY || '',
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    public: {
      githubBotTrigger: process.env.GITHUB_BOT_TRIGGER || '@nuxt-agent'
    }
  }
})
