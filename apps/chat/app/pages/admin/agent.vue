<script setup lang="ts">
const toast = useToast()

interface AgentConfig {
  id: string
  name: string
  additionalPrompt: string | null
  responseStyle: 'concise' | 'detailed' | 'technical' | 'friendly'
  language: string
  defaultModel: string | null
  maxStepsMultiplier: number
  temperature: number
  searchInstructions: string | null
  citationFormat: 'inline' | 'footnote' | 'none'
  isActive: boolean
}

const { data: config, refresh, status } = await useFetch<AgentConfig>('/api/agent-config')

const form = ref<{
  additionalPrompt: string
  responseStyle: 'concise' | 'detailed' | 'technical' | 'friendly'
  language: string
  defaultModel: string
  maxStepsMultiplier: number
  temperature: number
  searchInstructions: string
  citationFormat: 'inline' | 'footnote' | 'none'
}>({
  additionalPrompt: '',
  responseStyle: 'concise',
  language: 'en',
  defaultModel: 'auto',
  maxStepsMultiplier: 1.0,
  temperature: 0.7,
  searchInstructions: '',
  citationFormat: 'inline',
})

const isSaving = ref(false)
const isResetting = ref(false)

watch(config, (newConfig) => {
  if (newConfig) {
    form.value = {
      additionalPrompt: newConfig.additionalPrompt || '',
      responseStyle: newConfig.responseStyle,
      language: newConfig.language,
      defaultModel: newConfig.defaultModel || 'auto',
      maxStepsMultiplier: newConfig.maxStepsMultiplier,
      temperature: newConfig.temperature,
      searchInstructions: newConfig.searchInstructions || '',
      citationFormat: newConfig.citationFormat,
    }
  }
}, { immediate: true })

const responseStyleOptions = [
  { value: 'concise', label: 'Concise', description: 'Short and direct answers' },
  { value: 'detailed', label: 'Detailed', description: 'Full explanations with context' },
  { value: 'technical', label: 'Technical', description: 'For developers, with code examples' },
  { value: 'friendly', label: 'Friendly', description: 'Casual and easy to understand' },
]

const citationFormatOptions = [
  { value: 'inline', label: 'In text', description: 'Show sources as you read' },
  { value: 'footnote', label: 'At the end', description: 'List sources at the bottom' },
  { value: 'none', label: 'Hidden', description: 'Don\'t show sources' },
]

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
]

const modelOptions = [
  { value: 'auto', label: 'Automatic (Recommended)' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Fast' },
  { value: 'google/gemini-3-flash', label: 'Balanced' },
  { value: 'anthropic/claude-opus-4.5', label: 'Advanced' },
]

async function saveConfig() {
  isSaving.value = true
  try {
    await $fetch('/api/agent-config', {
      method: 'PUT',
      body: {
        additionalPrompt: form.value.additionalPrompt || null,
        responseStyle: form.value.responseStyle,
        language: form.value.language,
        defaultModel: form.value.defaultModel === 'auto' ? null : form.value.defaultModel,
        maxStepsMultiplier: form.value.maxStepsMultiplier,
        temperature: form.value.temperature,
        searchInstructions: form.value.searchInstructions || null,
        citationFormat: form.value.citationFormat,
      },
    })
    toast.add({
      title: 'Configuration saved',
      icon: 'i-lucide-check',
    })
    refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to save configuration',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isSaving.value = false
  }
}

async function resetConfig() {
  isResetting.value = true
  try {
    await $fetch('/api/agent-config/reset', { method: 'POST' })
    toast.add({
      title: 'Configuration reset',
      description: 'Settings have been restored to defaults',
      icon: 'i-lucide-check',
    })
    refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to reset configuration',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isResetting.value = false
  }
}
</script>

<template>
  <div class="px-6 lg:px-10 py-8 max-w-3xl">
    <header class="mb-8">
      <h1 class="text-lg font-medium text-highlighted mb-1">
        Assistant Settings
      </h1>
      <p class="text-sm text-muted max-w-lg">
        Customize how the AI assistant responds to questions.
      </p>
    </header>

    <div v-if="status === 'pending'" class="flex items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
    </div>

    <form v-else class="space-y-8" @submit.prevent="saveConfig">
      <!-- Custom Instructions -->
      <section>
        <label class="block text-sm font-medium text-highlighted mb-2">
          Custom Instructions
        </label>
        <p class="text-xs text-muted mb-3">
          Add rules or guidelines for how the assistant should behave.
        </p>
        <UTextarea
          v-model="form.additionalPrompt"
          placeholder="Example: Always be friendly and patient. When showing code, include comments explaining what it does..."
          :rows="4"
          autoresize
          class="w-full"
        />
      </section>

      <!-- Tone -->
      <section>
        <label class="block text-sm font-medium text-highlighted mb-2">
          Tone
        </label>
        <p class="text-xs text-muted mb-3">
          Choose how the assistant communicates.
        </p>
        <div class="grid grid-cols-2 gap-3">
          <label
            v-for="option in responseStyleOptions"
            :key="option.value"
            class="relative flex items-start p-3 rounded-lg border transition-colors cursor-pointer"
            :class="form.responseStyle === option.value ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
          >
            <input
              v-model="form.responseStyle"
              type="radio"
              name="responseStyle"
              :value="option.value"
              class="sr-only"
            >
            <div>
              <span class="text-sm font-medium text-highlighted">{{ option.label }}</span>
              <p class="text-xs text-muted mt-0.5">{{ option.description }}</p>
            </div>
          </label>
        </div>
      </section>

      <!-- Language & Intelligence Row -->
      <div class="grid grid-cols-2 gap-6">
        <section>
          <label class="block text-sm font-medium text-highlighted mb-2">
            Language
          </label>
          <p class="text-xs text-muted mb-3">
            The language the assistant will respond in.
          </p>
          <USelect
            v-model="form.language"
            :items="languageOptions"
            value-key="value"
            class="w-full"
          />
        </section>

        <section>
          <label class="block text-sm font-medium text-highlighted mb-2">
            Intelligence
          </label>
          <p class="text-xs text-muted mb-3">
            Choose between speed and quality.
          </p>
          <USelect
            v-model="form.defaultModel"
            :items="modelOptions"
            value-key="value"
            class="w-full"
          />
        </section>
      </div>

      <!-- Creativity & Search Depth Row -->
      <div class="grid grid-cols-2 gap-6">
        <section>
          <label class="block text-sm font-medium text-highlighted mb-2">
            Creativity
          </label>
          <p class="text-xs text-muted mb-3">
            How creative vs predictable the responses should be.
          </p>
          <USlider
            v-model="form.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            class="w-full"
          />
          <div class="flex justify-between text-xs text-muted mt-1">
            <span>Predictable</span>
            <span>Creative</span>
          </div>
        </section>

        <section>
          <label class="block text-sm font-medium text-highlighted mb-2">
            Search Depth
          </label>
          <p class="text-xs text-muted mb-3">
            How thoroughly the assistant searches for information.
          </p>
          <USlider
            v-model="form.maxStepsMultiplier"
            :min="0.5"
            :max="3"
            :step="0.1"
            class="w-full"
          />
          <div class="flex justify-between text-xs text-muted mt-1">
            <span>Quick</span>
            <span>Thorough</span>
          </div>
        </section>
      </div>

      <!-- Search Preferences -->
      <section>
        <label class="block text-sm font-medium text-highlighted mb-2">
          Search Preferences
        </label>
        <p class="text-xs text-muted mb-3">
          Guide how the assistant finds and prioritizes information.
        </p>
        <UTextarea
          v-model="form.searchInstructions"
          placeholder="Example: Focus on official documentation first. Check for the latest version information..."
          :rows="3"
          autoresize
          class="w-full"
        />
      </section>

      <!-- Source References -->
      <section>
        <label class="block text-sm font-medium text-highlighted mb-2">
          Source References
        </label>
        <p class="text-xs text-muted mb-3">
          How the assistant shows where it found the information.
        </p>
        <div class="flex gap-3">
          <label
            v-for="option in citationFormatOptions"
            :key="option.value"
            class="relative flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors cursor-pointer"
            :class="form.citationFormat === option.value ? 'border-primary bg-primary/5' : 'border-default hover:border-muted'"
          >
            <input
              v-model="form.citationFormat"
              type="radio"
              name="citationFormat"
              :value="option.value"
              class="sr-only"
            >
            <span class="text-sm font-medium text-highlighted">{{ option.label }}</span>
          </label>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex items-center gap-3 pt-4 border-t border-default">
        <UButton
          type="submit"
          :loading="isSaving"
          icon="i-lucide-save"
        >
          Save Changes
        </UButton>
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          :loading="isResetting"
          @click="resetConfig"
        >
          Reset to Defaults
        </UButton>
      </div>
    </form>
  </div>
</template>
