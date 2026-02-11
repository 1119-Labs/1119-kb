<script setup lang="ts">
import type { DefineComponent } from 'vue'
import PreStream from '../../components/prose/PreStream.vue'

import gettingStartedMd from '../../content/docs/getting-started.md?raw'
import apiKeysMd from '../../content/docs/api-keys.md?raw'
import sdkMd from '../../content/docs/sdk.md?raw'
import botSetupMd from '../../content/docs/bot-setup.md?raw'

const sections = [
  { id: 'getting-started', label: 'Getting Started', icon: 'i-lucide-rocket', content: gettingStartedMd },
  { id: 'api-keys', label: 'API Keys', icon: 'i-lucide-key', content: apiKeysMd },
  { id: 'sdk', label: 'SDK', icon: 'i-lucide-code', content: sdkMd },
  { id: 'bot-setup', label: 'GitHub Bot', icon: 'i-simple-icons-github', content: botSetupMd },
]

const activeSection = ref(sections[0]!.id)

const currentContent = computed(() => {
  return sections.find(s => s.id === activeSection.value)?.content ?? ''
})

const components = {
  pre: PreStream as unknown as DefineComponent,
}
</script>

<template>
  <div class="px-6 py-8 max-w-3xl mx-auto w-full">
    <header class="mb-6">
      <h1 class="text-lg font-medium text-highlighted mb-1 font-pixel tracking-wide">
        Documentation
      </h1>
      <p class="text-sm text-muted">
        Setup guides, API reference, and integration docs.
      </p>
    </header>

    <div class="flex items-center gap-1 mb-8">
      <UButton
        v-for="section in sections"
        :key="section.id"
        :icon="section.icon"
        :label="section.label"
        size="xs"
        :color="activeSection === section.id ? 'primary' : 'neutral'"
        :variant="activeSection === section.id ? 'solid' : 'ghost'"
        @click="activeSection = section.id"
      />
    </div>

    <div class="prose prose-sm prose-neutral dark:prose-invert max-w-none">
      <MDCCached
        :value="currentContent"
        :cache-key="activeSection"
        :components
        :parser-options="{ highlight: false }"
      />
    </div>
  </div>
</template>
