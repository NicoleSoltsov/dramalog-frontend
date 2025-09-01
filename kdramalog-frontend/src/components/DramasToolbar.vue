<script setup lang="ts">
const props = defineProps<{
  authed: boolean;
  bulkMode: boolean;
  allSelected: boolean;
  selectedCount: number;
}>();

const emit = defineEmits<{
  (e: 'toggle-bulk'): void;
  (e: 'toggle-all'): void;
  (e: 'bulk-delete'): void;
}>();
</script>

<template>
  <div style="display:flex; gap:8px; align-items:center; margin-bottom: 12px; flex-wrap:wrap;">
    <router-link
      v-if="props.authed && !props.bulkMode"
      to="/add"
      style="display: inline-block; padding: 8px 12px; background: #4caf50; color: white; border-radius: 6px; text-decoration: none;"
    >
      Add Drama
    </router-link>

    <button
      v-if="props.authed"
      @click="emit('toggle-bulk')"
      style="padding: 8px 12px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 6px; cursor: pointer;"
    >
      {{ props.bulkMode ? "Cancel" : "Select" }}
    </button>

    <button
      v-if="props.authed && props.bulkMode"
      @click="emit('toggle-all')"
      style="padding: 8px 12px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 6px; cursor: pointer;"
    >
      {{ props.allSelected ? "Unselect All" : "Select All" }}
    </button>

    <button
      v-if="props.authed && props.bulkMode"
      :disabled="props.selectedCount === 0"
      @click="emit('bulk-delete')"
      style="padding: 8px 12px; background: #ff4d4d; color: white; border: none; border-radius: 6px; cursor: pointer; opacity: var(--op, 1);"
      :style="{ '--op': props.selectedCount === 0 ? 0.6 : 1 }"
    >
      Delete ({{ props.selectedCount }})
    </button>
  </div>
</template>
