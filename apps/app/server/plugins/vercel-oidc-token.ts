/**
 * Ensure VERCEL_OIDC_TOKEN is on process.env so @vercel/sandbox (Snapshot.list, etc.)
 * can read it. Nuxt runtimeConfig is populated from NUXT_VERCEL_OIDC_TOKEN or we pass
 * from env; without this, the SDK may not see the token in some Docker/runtime contexts.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const token = config.vercelOidcToken || process.env.VERCEL_OIDC_TOKEN
  if (token) {
    process.env.VERCEL_OIDC_TOKEN = token
  }
})
