<script setup lang="ts">
import { z } from 'zod'

const appConfig = useAppConfig()
const { data: loginProviders } = await useFetch<{ github: boolean; google: boolean }>('/api/login-providers')
const githubLoginEnabled = computed(() => loginProviders.value?.github ?? false)
const googleLoginEnabled = computed(() => loginProviders.value?.google ?? false)
const socialLoginEnabled = computed(() => githubLoginEnabled.value || googleLoginEnabled.value)

definePageMeta({ layout: false, auth: 'guest' })

const ogImage = `${useRequestURL().origin}/og.jpg`

useSeoMeta({
  title: 'Sign in',
  description: appConfig.app.description,
  ogTitle: appConfig.app.name,
  ogDescription: appConfig.app.description,
  ogImage,
  twitterImage: ogImage,
  twitterCard: 'summary_large_image',
})

const route = useRoute()
const mode = ref<'signin' | 'signup'>('signin')
const loading = ref(false)
const error = ref('')
const { signIn, signUp } = useUserSession()

onMounted(() => {
  const queryError = route.query.error as string | undefined
  if (queryError) {
    error.value = `Authentication error: ${queryError}`
  }
})

const state = reactive({ name: '', email: '', password: '' })

const signInSchema = z.object({
  name: z.string().optional(),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const schema = computed(() => mode.value === 'signup' ? signUpSchema : signInSchema)

async function onGitHubSignIn() {
  loading.value = true
  error.value = ''
  try {
    await signIn.social({ provider: 'github', callbackURL: '/' })
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'GitHub login failed. Please try again.'
    loading.value = false
  }
}

async function onGoogleSignIn() {
  loading.value = true
  error.value = ''
  try {
    await signIn.social({ provider: 'google', callbackURL: '/' })
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Google login failed. Please try again.'
    loading.value = false
  }
}

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    if (mode.value === 'signup') {
      await signUp.email({ name: state.name, email: state.email, password: state.password })
    } else {
      await signIn.email({ email: state.email, password: state.password })
    }
    await navigateTo('/', { replace: true })
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <div class="flex min-h-dvh bg-default">
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
      <div class="absolute top-4 right-4 flex items-center gap-1">
        <UButton
          :to="appConfig.app.repoUrl"
          target="_blank"
          icon="i-simple-icons-github"
          color="neutral"
          variant="ghost"
          size="sm"
          square
        />
        <UColorModeButton size="sm" />
      </div>

      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center mb-4">
            <UIcon :name="appConfig.app.icon" class="size-8 text-highlighted" />
          </div>
          <h1 class="text-2xl font-semibold text-highlighted">
            {{ mode === 'signin' ? 'Welcome back' : 'Create your account' }}
          </h1>
          <p class="mt-1.5 text-sm text-muted">
            {{ mode === 'signin' ? 'Sign in to your account.' : 'Create your account to get started.' }}
          </p>
        </div>

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          :title="error"
          icon="i-lucide-circle-alert"
          :close="{ color: 'error', variant: 'link' }"
          class="mb-4"
          @close="error = ''"
        />

        <UForm :schema :state class="space-y-4" @submit="onSubmit">
          <div class="name-field-wrapper" :class="mode === 'signup' ? 'expanded' : 'collapsed'">
            <div class="name-field-inner">
              <UFormField label="Name" name="name">
                <UInput
                  v-model="state.name"
                  placeholder="Your name"
                  size="lg"
                  class="w-full"
                  :tabindex="mode === 'signup' ? 0 : -1"
                />
              </UFormField>
            </div>
          </div>

          <UFormField label="Email" name="email">
            <UInput v-model="state.email" type="email" placeholder="you@example.com" size="lg" class="w-full" />
          </UFormField>

          <UFormField label="Password" name="password">
            <UInput v-model="state.password" type="password" placeholder="••••••••" size="lg" class="w-full" />
          </UFormField>

          <UButton
            type="submit"
            :label="mode === 'signin' ? 'Sign in' : 'Create account'"
            block
            size="lg"
            :loading
          />
        </UForm>

        <div v-if="socialLoginEnabled" class="relative my-5">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-default" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-default px-2 text-muted">Or continue with</span>
          </div>
        </div>

        <UButton
          v-if="githubLoginEnabled"
          label="Login with GitHub"
          icon="i-simple-icons-github"
          color="neutral"
          variant="soft"
          block
          size="lg"
          :loading
          @click="onGitHubSignIn"
        />

        <UButton
          v-if="googleLoginEnabled"
          label="Login with Google"
          icon="i-simple-icons-google"
          color="neutral"
          variant="soft"
          block
          size="lg"
          :loading
          @click="onGoogleSignIn"
        />

        <p class="mt-6 text-center text-sm text-muted">
          <template v-if="mode === 'signin'">
            Don't have an account?
            <button class="text-highlighted font-medium hover:underline cursor-pointer" @click="mode = 'signup'">
              Sign up
            </button>
          </template>
          <template v-else>
            Already have an account?
            <button class="text-highlighted font-medium hover:underline cursor-pointer" @click="mode = 'signin'">
              Sign in
            </button>
          </template>
        </p>

        <UAlert
          class="mt-8"
          color="neutral"
          variant="subtle"
          icon="i-lucide-info"
          :title="appConfig.app.description"
          :ui="{ root: 'p-3', title: 'text-xs font-normal', icon: 'size-4' }"
        />

        <p class="mt-6 text-center text-xs text-dimmed">
          This is a demo instance of a template project. Data may be reset at any time — do not store anything you want to keep.
        </p>
      </div>
    </div>

    <div class="hidden lg:block w-1/2 m-2 rounded-lg relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950" />
      <div class="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_35%)]" />
      <div class="absolute inset-0 rounded-lg shadow-[inset_0_4px_30px_rgba(0,0,0,0.5),inset_0_0_80px_rgba(0,0,0,0.35),inset_0_-2px_20px_rgba(0,0,0,0.25)] pointer-events-none" />
    </div>
  </div>
</template>

<style scoped>
/* CSS grid trick for smooth name field expand/collapse */
.name-field-wrapper {
  display: grid;
  transition: grid-template-rows 300ms ease, opacity 200ms ease;
}

.name-field-wrapper.expanded {
  grid-template-rows: 1fr;
  opacity: 1;
}

.name-field-wrapper.collapsed {
  grid-template-rows: 0fr;
  opacity: 0;
}

.name-field-inner {
  overflow: hidden;
}
</style>
