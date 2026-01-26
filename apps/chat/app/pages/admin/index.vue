<script setup lang="ts">
import { LazyModalConfirm } from '#components'

interface SerializedSource {
  id: string
  type: 'github' | 'youtube'
  label: string
  repo: string | null
  branch: string | null
  contentPath: string | null
  outputPath: string | null
  readmeOnly: boolean | null
  channelId: string | null
  handle: string | null
  maxVideos: number | null
  createdAt: string
  updatedAt: string
}

const toast = useToast()
const overlay = useOverlay()

const { data: sources, refresh } = await useFetch('/api/sources')

const editingSource = ref<SerializedSource | null>(null)
const isSyncingAll = ref(false)

const deleteModal = overlay.create(LazyModalConfirm, {
  destroyOnClose: true,
})

async function deleteSource(source: SerializedSource) {
  const confirmed = await deleteModal.open({
    title: 'Delete Source',
    description: `Are you sure you want to delete "${source.label}"?`,
  })

  if (!confirmed) return

  try {
    await $fetch(`/api/sources/${source.id}`, { method: 'DELETE' })
    toast.add({
      title: 'Source deleted',
      icon: 'i-lucide-check',
    })
    refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to delete source',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

async function triggerSync(sourceId?: string) {
  try {
    if (!sourceId) {
      isSyncingAll.value = true
    }
    const endpoint = sourceId ? `/api/sync/${sourceId}` : '/api/sync'
    await $fetch(endpoint, { method: 'POST' })
    toast.add({
      title: sourceId ? 'Sync started' : 'Full sync started',
      description: 'The sync workflow has been triggered.',
      icon: 'i-lucide-check',
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to start sync',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    isSyncingAll.value = false
  }
}

function handleSaved() {
  refresh()
  editingSource.value = null
}

const hasSources = computed(() => (sources.value?.github?.count || 0) + (sources.value?.youtube?.count || 0) > 0)
</script>

<template>
  <div class="px-6 lg:px-10 py-8 max-w-3xl">
    <header class="mb-8">
      <h1 class="text-lg font-medium text-highlighted mb-1">
        Sources
      </h1>
      <p class="text-sm text-muted max-w-lg">
        Sources are knowledge bases that give the AI context. Connect GitHub repositories for documentation or YouTube channels for video transcripts.
      </p>
    </header>

    <div
      v-if="hasSources"
      class="flex items-center gap-2 mb-6"
    >
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        size="xs"
        :loading="isSyncingAll"
        @click="triggerSync()"
      >
        Sync All
      </UButton>
      <UButton
        icon="i-lucide-plus"
        size="xs"
        to="/admin/new"
      >
        Add Source
      </UButton>
    </div>

    <div
      v-if="!hasSources"
      class="flex flex-col items-center py-16 border border-dashed border-default rounded-lg"
    >
      <div class="size-10 rounded-lg bg-elevated flex items-center justify-center mb-4">
        <UIcon name="i-lucide-database" class="size-5 text-muted" aria-hidden="true" />
      </div>
      <p class="text-sm font-medium text-highlighted mb-1">
        No sources yet
      </p>
      <p class="text-xs text-muted mb-4 text-center max-w-xs">
        Add your first source to give the AI knowledge about your favorite tools
      </p>
      <UButton
        icon="i-lucide-plus"
        size="xs"
        to="/admin/new"
      >
        Add your first source
      </UButton>
    </div>

    <div v-else class="space-y-8">
      <section>
        <p class="text-xs text-muted mb-3">
          GitHub Repositories
        </p>

        <div
          v-if="sources?.github?.count"
          class="rounded-lg border border-default divide-y divide-default overflow-hidden"
        >
          <div v-for="source in sources.github.sources" :key="source.id" class="px-4 hover:bg-elevated/50 transition-colors">
            <SourceCard
              :source
              @edit="editingSource = source"
              @delete="deleteSource(source)"
              @sync="triggerSync(source.id)"
            />
          </div>
        </div>
        <UButton
          v-else
          color="neutral"
          variant="ghost"
          class="w-full h-14 border border-dashed border-default hover:border-muted"
          to="/admin/new"
          icon="i-lucide-plus"
        >
          Add a GitHub repository
        </UButton>
      </section>

      <section>
        <p class="text-xs text-muted mb-3">
          YouTube Channels
        </p>

        <div
          v-if="sources?.youtube?.count"
          class="rounded-lg border border-default divide-y divide-default overflow-hidden"
        >
          <div v-for="source in sources.youtube.sources" :key="source.id" class="px-4 hover:bg-elevated/50 transition-colors">
            <SourceCard
              :source
              @edit="editingSource = source"
              @delete="deleteSource(source)"
              @sync="triggerSync(source.id)"
            />
          </div>
        </div>
        <UButton
          v-else
          color="neutral"
          variant="ghost"
          class="w-full h-14 border border-dashed border-default hover:border-muted"
          to="/admin/new"
          icon="i-lucide-plus"
        >
          Add a YouTube channel
        </UButton>
      </section>
    </div>

    <SourceModal
      v-if="editingSource"
      :source="editingSource"
      @close="editingSource = null"
      @saved="handleSaved"
    />
  </div>
</template>
