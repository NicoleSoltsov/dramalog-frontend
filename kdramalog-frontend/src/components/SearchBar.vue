<script setup lang="ts">
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
  (e: 'search'): void;
  (e: 'clear'): void;
}>();
</script>

<template>
  <div style="margin-bottom: 10px;">
    <div style="display:flex; gap:8px; align-items:center;">
      <input
        :value="props.modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @keyup.enter="emit('search')"
        placeholder="Find a drama you've added..."
        style="flex:1; padding: 10px 12px; border: 1px solid #ccc; border-radius: 8px;"
      />
      <button
        @click="emit('search')"
        style="padding: 10px 14px; border: none; background: #4caf50; color: white; border-radius: 8px; cursor: pointer; white-space:nowrap;"
      >
        Search
      </button>
      <button
        v-if="props.modelValue"
        @click="emit('clear')"
        style="padding: 10px 14px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 8px; cursor: pointer; white-space:nowrap;"
      >
        Clear
      </button>
    </div>
  </div>
</template>
