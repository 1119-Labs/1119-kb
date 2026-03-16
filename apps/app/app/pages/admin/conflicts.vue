<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'

useSeoMeta({ title: 'Knowledge Conflicts - Admin' })

type Severity = 'high' | 'medium' | 'low'
type ConflictStatus = 'open' | 'acknowledged' | 'resolved'
type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

interface ConflictRow {
  id: string
  topic: string
  severity: Severity
  confidence: number
  status: ConflictStatus
  sourceAId: string
  sourceBId: string
  createdAt: string
}

interface RunInfo {
  id: string
  status: RunStatus
  model: string
  sourceCount: number
  checkedPairs: number
  createdAt: string
  finishedAt: string | null
  error?: string | null
}

interface ConflictsResponse {
  run: RunInfo | null
  summary: {
    open: number
    high: number
    medium: number
    low: number
  }
  conflicts: ConflictRow[]
}

interface ConflictDetails extends ConflictRow {
  claimA: string
  claimB: string
  rationale: string
  sourceAVersionId: string
  sourceBVersionId: string
  sourceA: { id: string, label: string, type: string } | null
  sourceB: { id: string, label: string, type: string } | null
  sourceAVersion: { id: string, versionFolderName: string, syncedAt: string } | null
  sourceBVersion: { id: string, versionFolderName: string, syncedAt: string } | null
}

const toast = useToast()
const { showError } = useErrorToast()
const selectedConflictId = ref<string | null>(null)
const detailOpen = ref(false)
const runningDetection = ref(false)
const clearingRun = ref(false)

const { data, status, refresh } = useLazyFetch<ConflictsResponse>('/api/conflicts', {
  default: () => ({
    run: null,
    summary: { open: 0, high: 0, medium: 0, low: 0 },
    conflicts: [],
  }),
})

const run = computed(() => data.value?.run ?? null)
const rows = computed(() => data.value?.conflicts ?? [])
const summary = computed(() => data.value?.summary ?? { open: 0, high: 0, medium: 0, low: 0 })

const { data: detail, status: detailStatus, refresh: refreshDetail } = useLazyFetch<ConflictDetails>(
  () => selectedConflictId.value ? `/api/conflicts/${selectedConflictId.value}` : '/api/conflicts/invalid',
  {
    immediate: false,
    default: () => null as unknown as ConflictDetails,
  },
)

const columns: TableColumn<ConflictRow>[] = [
  { accessorKey: 'topic', header: 'Topic' },
  { accessorKey: 'severity', header: 'Severity', meta: { class: { th: 'w-24' } } },
  { accessorKey: 'confidence', header: 'Confidence', meta: { class: { th: 'w-28 text-right', td: 'text-right' } } },
  { accessorKey: 'status', header: 'Status', meta: { class: { th: 'w-36' } } },
  { accessorKey: 'actions', header: 'Actions', meta: { class: { th: 'w-44 text-right', td: 'text-right' } } },
]

const isRunInProgress = computed(() => run.value?.status === 'pending' || run.value?.status === 'running')

const POLL_INTERVAL_MS = 5000
useIntervalFn(() => {
  if (isRunInProgress.value) refresh()
}, POLL_INTERVAL_MS)

function getSeverityColor(value: Severity): 'error' | 'warning' | 'primary' {
  if (value === 'high') return 'error'
  if (value === 'medium') return 'warning'
  return 'primary'
}

function getStatusColor(value: ConflictStatus | RunStatus): 'primary' | 'warning' | 'success' | 'error' {
  if (value === 'resolved' || value === 'completed') return 'success'
  if (value === 'acknowledged') return 'warning'
  if (value === 'failed') return 'error'
  return 'primary'
}

function formatConfidence(value: number): string {
  return `${Math.round((value || 0) * 100)}%`
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString()
}

async function runDetection() {
  runningDetection.value = true
  try {
    await $fetch('/api/conflicts/run', { method: 'POST' })
    toast.add({
      title: 'Conflict detection started',
      description: 'The workflow is now analyzing latest source versions.',
      icon: 'i-lucide-check',
    })
    await refresh()
  } catch (error) {
    showError(error, { fallback: 'Failed to start conflict detection' })
  } finally {
    runningDetection.value = false
  }
}

async function updateStatus(row: ConflictRow, next: 'acknowledged' | 'resolved') {
  try {
    await $fetch(`/api/conflicts/${row.id}/status`, {
      method: 'PATCH',
      body: { status: next },
    })
    await refresh()
    if (selectedConflictId.value === row.id) {
      await refreshDetail()
    }
    toast.add({
      title: 'Conflict updated',
      icon: 'i-lucide-check',
    })
  } catch (error) {
    showError(error, { fallback: 'Failed to update conflict status' })
  }
}

async function openDetails(row: ConflictRow) {
  selectedConflictId.value = row.id
  detailOpen.value = true
  await refreshDetail()
}

async function clearRun() {
  if (!run.value?.id) return
  clearingRun.value = true
  try {
    await $fetch(`/api/conflicts/run/${run.value.id}`, {
      method: 'DELETE',
    })
    toast.add({
      title: 'Run cleared',
      description: 'Run and its conflicts have been deleted.',
      icon: 'i-lucide-check',
    })
    await refresh()
  } catch (error) {
    showError(error, { fallback: 'Failed to clear run' })
  } finally {
    clearingRun.value = false
  }
}
</script>

<template>
  <div class="px-6 py-8 max-w-6xl mx-auto w-full">
    <header class="mb-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-lg font-medium text-highlighted mb-1 font-pixel tracking-wide">
            Knowledge Conflicts
          </h1>
          <p class="text-sm text-muted max-w-2xl">
            Detect contradictory claims between the latest synced source versions.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="status === 'pending'"
            @click="refresh()"
          >
            Refresh
          </UButton>
          <UButton
            icon="i-lucide-sparkles"
            size="xs"
            :loading="runningDetection"
            :disabled="isRunInProgress"
            @click="runDetection()"
          >
            Run Detection
          </UButton>
        </div>
      </div>
    </header>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <UCard>
        <p class="text-xs text-muted mb-1">Open</p>
        <p class="text-lg font-medium">{{ summary.open }}</p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted mb-1">High</p>
        <p class="text-lg font-medium text-error">{{ summary.high }}</p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted mb-1">Medium</p>
        <p class="text-lg font-medium text-warning">{{ summary.medium }}</p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted mb-1">Low</p>
        <p class="text-lg font-medium">{{ summary.low }}</p>
      </UCard>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <span>Run: <span class="text-highlighted">{{ run?.id || '—' }}</span></span>
        <span>
          Status:
          <UBadge
            v-if="run"
            :label="run.status"
            :color="getStatusColor(run.status)"
            size="xs"
            variant="subtle"
            class="capitalize"
          />
          <span v-else> — </span>
        </span>
        <span>Model: <span class="text-highlighted">{{ run?.model || '—' }}</span></span>
        <span>Sources: <span class="text-highlighted">{{ run?.sourceCount ?? 0 }}</span></span>
        <span>Pairs: <span class="text-highlighted">{{ run?.checkedPairs ?? 0 }}</span></span>
        <span>Created: <span class="text-highlighted">{{ formatDate(run?.createdAt) }}</span></span>
      </div>
      <p v-if="run?.status === 'failed' && run?.error" class="text-xs text-error mt-2">
        {{ run.error }}
      </p>
      <div v-if="run" class="mt-3">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          :loading="clearingRun"
          @click="clearRun()"
        >
          Clear run
        </UButton>
      </div>
    </UCard>

    <UTable
      :data="rows"
      :columns
      :loading="status === 'pending'"
    >
      <template #topic-cell="{ row }">
        <button class="text-left text-sm text-highlighted hover:underline" @click="openDetails(row.original)">
          {{ row.original.topic }}
        </button>
      </template>

      <template #severity-cell="{ row }">
        <UBadge
          :label="row.original.severity"
          :color="getSeverityColor(row.original.severity)"
          variant="subtle"
          size="xs"
          class="capitalize"
        />
      </template>

      <template #confidence-cell="{ row }">
        <span class="text-xs text-muted tabular-nums">{{ formatConfidence(row.original.confidence) }}</span>
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :label="row.original.status"
          :color="getStatusColor(row.original.status)"
          variant="subtle"
          size="xs"
          class="capitalize"
        />
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="row.original.status !== 'open'"
            @click="updateStatus(row.original, 'acknowledged')"
          >
            Acknowledge
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="row.original.status === 'resolved'"
            @click="updateStatus(row.original, 'resolved')"
          >
            Resolve
          </UButton>
        </div>
      </template>

      <template #empty>
        <div class="py-10 text-center">
          <p class="text-sm text-muted">
            No conflicts found for the latest run.
          </p>
        </div>
      </template>
    </UTable>

    <UModal v-model:open="detailOpen" :title="detail?.topic || 'Conflict details'" :ui="{ body: 'space-y-4' }">
      <template #body>
        <div v-if="detailStatus === 'pending'" class="py-4 text-sm text-muted">
          Loading details...
        </div>
        <div v-else-if="detail" class="space-y-4">
          <div class="grid grid-cols-2 gap-2 text-xs">
            <p>
              Severity:
              <UBadge :label="detail.severity" :color="getSeverityColor(detail.severity)" variant="subtle" size="xs" class="capitalize" />
            </p>
            <p>Confidence: <span class="text-highlighted">{{ formatConfidence(detail.confidence) }}</span></p>
            <p>
              Status:
              <UBadge :label="detail.status" :color="getStatusColor(detail.status)" variant="subtle" size="xs" class="capitalize" />
            </p>
            <p>Created: <span class="text-highlighted">{{ formatDate(detail.createdAt) }}</span></p>
          </div>

          <UCard>
            <p class="text-xs text-muted mb-1">Source A claim</p>
            <p class="text-sm">{{ detail.claimA }}</p>
            <p class="text-xs text-muted mt-2">
              {{ detail.sourceA?.label || detail.sourceAId }} · {{ detail.sourceAVersion?.versionFolderName || detail.sourceAVersionId }}
            </p>
          </UCard>

          <UCard>
            <p class="text-xs text-muted mb-1">Source B claim</p>
            <p class="text-sm">{{ detail.claimB }}</p>
            <p class="text-xs text-muted mt-2">
              {{ detail.sourceB?.label || detail.sourceBId }} · {{ detail.sourceBVersion?.versionFolderName || detail.sourceBVersionId }}
            </p>
          </UCard>

          <UCard>
            <p class="text-xs text-muted mb-1">Rationale</p>
            <p class="text-sm">{{ detail.rationale }}</p>
          </UCard>
        </div>
      </template>
    </UModal>
  </div>
</template>
