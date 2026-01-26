<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})
</script>

<template>
  <UDashboardPanel id="admin-content">
    <template #body>
      <NuxtPage />
    </template>
  </UDashboardPanel>
</template>
