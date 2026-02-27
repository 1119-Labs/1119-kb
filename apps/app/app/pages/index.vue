<script setup lang="ts">
definePageMeta({ auth: 'user' })

useSeoMeta({ title: 'New chat' })

const input = ref('')
const loading = ref(false)
const chatId = crypto.randomUUID()

const { model } = useModels()
const { mode } = useChatMode()

const {
  dropzoneRef,
  isDragging,
  files,
  isUploading,
  uploadedFiles,
  addFiles,
  removeFile,
  clearFiles
} = useFileUploadWithStatus(chatId)

interface SourceVersion {
  versionFolderName: string
  refType: string
  ref: string
  syncedAt: string
}
interface SourceWithVersions {
  id: string
  label: string
  type: string
  versions: SourceVersion[]
}
const { data: sourcesData } = await useFetch<{ github: { sources: SourceWithVersions[] }; youtube: { sources: SourceWithVersions[] } }>('/api/sources')
const sourcesWithVersions = computed(() => {
  const list = [...(sourcesData.value?.github?.sources ?? []), ...(sourcesData.value?.youtube?.sources ?? [])]
  return list.filter(s => s.versions?.length > 0)
})
const selectedSourceVersions = ref<Record<string, string>>({})
watch(sourcesWithVersions, (sources) => {
  const next: Record<string, string> = { ...selectedSourceVersions.value }
  for (const s of sources) {
    if (next[s.id] === undefined && s.versions?.[0])
      next[s.id] = s.versions[0].versionFolderName
  }
  selectedSourceVersions.value = next
}, { immediate: true })

const knowledgeVersionsOpen = ref(false)

async function createChat(prompt: string) {
  input.value = prompt
  loading.value = true

  const parts: Array<{ type: string, text?: string, mediaType?: string, url?: string }> = [{ type: 'text', text: prompt }]

  if (uploadedFiles.value.length > 0) {
    parts.push(...uploadedFiles.value)
  }

  const chat = await $fetch('/api/chats', {
    method: 'POST',
    body: {
      id: chatId,
      mode: mode.value,
      message: {
        role: 'user',
        parts
      }
    }
  })

  if (mode.value === 'chat' && Object.keys(selectedSourceVersions.value).length > 0) {
    try {
      sessionStorage.setItem('newChatSourceVersions', JSON.stringify(selectedSourceVersions.value))
    } catch (_) {}
  }
  refreshNuxtData('chats')
  navigateTo(`/chat/${chat?.id}`)
}

async function onSubmit() {
  await createChat(input.value)
  clearFiles()
}

const chatQuickChats = [
  {
    label: 'How do I use unstorage with NuxtHub KV?',
    icon: 'i-logos-nuxt-icon'
  },
  {
    label: 'What are Nitro tasks and how do I use them?',
    icon: 'i-custom-nitro'
  },
  {
    label: 'How do I build a multi-step agent with ToolLoopAgent?',
    icon: 'i-lucide-bot'
  },
  {
    label: 'How do I use streamText with tool calling?',
    icon: 'i-lucide-sparkles'
  },
  {
    label: 'How do I configure model fallbacks with AI Gateway?',
    icon: 'i-lucide-shuffle'
  },
  {
    label: 'How do I build a Discord bot with the chat SDK?',
    icon: 'i-simple-icons-discord'
  }
]

const adminQuickChats = [
  {
    label: 'Chart the daily token usage by model over the last 30 days',
    icon: 'i-custom-chart'
  },
  {
    label: 'Show app health: error rate, latency p95, and slowest endpoints',
    icon: 'i-lucide-activity'
  },
  {
    label: 'Are there any production errors in the last 24h? Show the trend',
    icon: 'i-lucide-alert-triangle'
  },
  {
    label: 'Chart active users and message volume over the last 14 days',
    icon: 'i-custom-users'
  },
  {
    label: 'What are the top 10 most-hit endpoints and their avg latency?',
    icon: 'i-lucide-zap'
  },
  {
    label: 'Show usage stats for the last 7 days with a cost breakdown chart',
    icon: 'i-lucide-coins'
  }
]

const quickChats = computed(() => mode.value === 'admin' ? adminQuickChats : chatQuickChats)
</script>

<template>
  <UDashboardPanel id="home" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <DashboardNavbar />
    </template>

    <template #body>
      <DragDropOverlay :show="isDragging" />
      <UContainer ref="dropzoneRef" class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8">
        <h1 class="text-3xl sm:text-4xl text-highlighted font-semibold tracking-wide">
          How can I help you today?
        </h1>

        <UChatPrompt
          v-model="input"
          :status="loading ? 'streaming' : 'ready'"
          :disabled="isUploading"
          class="[view-transition-name:chat-prompt]"
          variant="subtle"
          :ui="{ base: 'px-1.5' }"
          @submit="onSubmit"
        >
          <template v-if="files.length > 0" #header>
            <div class="flex flex-wrap gap-2">
              <FileAvatar
                v-for="fileWithStatus in files"
                :key="fileWithStatus.id"
                :name="fileWithStatus.file.name"
                :type="fileWithStatus.file.type"
                :preview-url="fileWithStatus.previewUrl"
                :status="fileWithStatus.status"
                :error="fileWithStatus.error"
                removable
                @remove="removeFile(fileWithStatus.id)"
              />
            </div>
          </template>

          <template #footer>
            <div v-if="mode === 'chat' && sourcesWithVersions.length > 0" class="w-full mb-2">
              <UCollapsible v-model:open="knowledgeVersionsOpen">
                <UButton variant="ghost" size="xs" color="neutral" class="gap-1.5" trailing-icon="i-lucide-chevron-down">
                  Knowledge versions
                </UButton>
                <template #content>
                  <div class="flex flex-wrap gap-3 pl-1 pt-1">
                    <div v-for="s in sourcesWithVersions" :key="s.id" class="flex items-center gap-2">
                      <span class="text-xs text-muted truncate max-w-24" :title="s.label">{{ s.label }}</span>
                      <USelectMenu
                        :model-value="selectedSourceVersions[s.id] ?? s.versions[0]?.versionFolderName"
                        :items="s.versions.map(v => ({ value: v.versionFolderName, label: v.versionFolderName }))"
                        value-key="value"
                        size="xs"
                        variant="ghost"
                        class="w-48"
                        @update:model-value="(v: string) => { selectedSourceVersions = { ...selectedSourceVersions, [s.id]: v } }"
                      />
                    </div>
                  </div>
                </template>
              </UCollapsible>
            </div>
            <div class="flex items-center gap-1">
              <FileUploadButton @files-selected="addFiles($event)" />
              <ModelSelect v-model="model" />
            </div>

            <UChatPromptSubmit size="sm" :disabled="isUploading" />
          </template>
        </UChatPrompt>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <UButton
            v-for="quickChat in quickChats"
            :key="quickChat.label"
            :icon="quickChat.icon"
            :label="quickChat.label"
            size="sm"
            color="neutral"
            variant="outline"
            @click="createChat(quickChat.label)"
          />
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
