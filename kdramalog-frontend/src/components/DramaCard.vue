<script setup lang="ts">
type Drama = { id:number; title:string; tmdb_id:number; poster_url?:string };

const props = defineProps<{
  drama: Drama;
  bulkMode: boolean;
  selected: boolean;
  authed: boolean;
}>();

const emit = defineEmits<{
  (e: 'open', drama: Drama): void;
  (e: 'toggle', id: number): void;
  (e: 'delete', id: number): void;
}>();
</script>

<template>
  <div
    style="text-align: center; cursor: pointer; background: white; border-radius: 8px; padding: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); position: relative; width: 200px;"
    @click="!props.bulkMode && emit('open', props.drama)"
  >
    <label
      v-if="props.bulkMode"
      style="position:absolute; top:10px; left:10px; background:white; border-radius:4px; padding:2px 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);"
    >
      <input type="checkbox" :checked="props.selected" @change.stop="emit('toggle', props.drama.id)" />
    </label>

    <img
      :src="props.drama.poster_url || '/placeholder.png'"
      alt="Poster"
      style="width: 100%; border-radius: 6px; height: 320px; object-fit: cover;"
    />
    <p style="margin-top: 10px; font-weight: 500; font-size: 1rem;">
      {{ props.drama.title }}
    </p>

    <button
      v-if="props.authed && !props.bulkMode"
      @click.stop="emit('delete', props.drama.id)"
      style="margin-top: 8px; padding: 6px 12px; background: #ff4d4d; color: white; border: none; border-radius: 4px; cursor: pointer;"
    >
      Delete
    </button>
  </div>
</template>
