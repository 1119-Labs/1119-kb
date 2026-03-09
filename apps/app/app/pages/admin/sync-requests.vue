<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

useSeoMeta({ title: 'Sync Requests - Admin' })

type SyncRequestStatus = 'started' | 'success' | 'failed'

interface SyncSummary {
  total: number
  success: number
  failed: number
  files: number
}

interface SyncRequestRow {
  id: string
  status: SyncRequestStatus
  sourceFilter: string | null
  sourceCount: number
  summary: SyncSummary | null
  error: string | null
  createdAt: string
  updatedAt: string
}

interface SyncRequestsResponse {
  items: SyncRequestRow[]
  page: number
  pageSize: number
  total: number
}

const page = ref(1)
const pageSize = ref(10)

const query = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, status, refresh } = useLazyFetch<SyncRequestsResponse>('/api/admin/sync-requests', {
  query,
  watch: [query],
  default: () => ({
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
  }),
})

const rows = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

const columns: TableColumn<SyncRequestRow>[] = [
  { accessorKey: 'createdAt', header: 'Created' },
  { accessorKey: 'status', header: 'Status', meta: { class: { th: 'w-28' } } },
  { accessorKey: 'sourceCount', header: 'Sources', meta: { class: { th: 'w-20 text-right', td: 'text-right' } } },
  { accessorKey: 'sourceFilter', header: 'Scope', meta: { class: { th: 'w-44' } } },
  { accessorKey: 'summary', header: 'Details' },
]

function formatDate(date: string): string {
  return new Date(date).toLocaleString()
}

function getStatusColor(statusValue: SyncRequestStatus): 'primary' | 'success' | 'error' {
  if (statusValue === 'success') return 'success'
  if (statusValue === 'failed') return 'error'
  return 'primary'
}
</script>

<template>
  <div class="px-6 py-8 max-w-5xl mx-auto w-full">
    <header class="mb-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-lg font-medium text-highlighted mb-1 font-pixel tracking-wide">
            Sync Requests
          </h1>
          <p class="text-sm text-muted max-w-lg">
            Track sync workflow runs and their latest status.
          </p>
        </div>
        <UTooltip text="Refresh data">
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="status === 'pending'"
            @click="refresh()"
          />
        </UTooltip>
      </div>
    </header>

    <section>
      <UTable
        :data="rows"
        :columns
        :loading="status === 'pending'"
      >
        <template #createdAt-cell="{ row }">
          <div class="text-xs text-muted">
            {{ formatDate(row.original.createdAt) }}
          </div>
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

        <template #sourceCount-cell="{ row }">
          <span class="text-xs text-muted tabular-nums">{{ row.original.sourceCount }}</span>
        </template>

        <template #sourceFilter-cell="{ row }">
          <span class="text-xs text-muted">
            {{ row.original.sourceFilter || 'All sources' }}
          </span>
        </template>

        <template #summary-cell="{ row }">
          <div class="text-xs min-w-0">
            <template v-if="row.original.status === 'failed' && row.original.error">
              <span class="text-error truncate block">{{ row.original.error }}</span>
            </template>
            <template v-else-if="row.original.summary">
              <span class="text-muted">
                {{ row.original.summary.success }}/{{ row.original.summary.total }} succeeded ·
                {{ row.original.summary.files }} files
              </span>
            </template>
            <template v-else>
              <span class="text-muted">In progress...</span>
            </template>
          </div>
        </template>

        <template #empty>
          <div class="py-8 text-center">
            <p class="text-sm text-muted">
              No sync requests found.
            </p>
          </div>
        </template>
      </UTable>

      <div v-if="total > pageSize" class="flex items-center justify-between mt-3 px-1">
        <p class="text-xs text-muted">
          {{ total }} request{{ total !== 1 ? 's' : '' }}
        </p>
        <UPagination
          :page
          :items-per-page="pageSize"
          :total
          size="xs"
          @update:page="(p: number) => page = p"
        />
      </div>
    </section>
  </div>
</template>
