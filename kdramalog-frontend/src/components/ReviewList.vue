<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import http from "@/api/http";

const props = defineProps<{ dramaTitle: string }>(); // or accept dramaId if you prefer

const allReviews = ref<any[]>([]);
const loading = ref(false);
const error = ref("");

// Fetch ALL reviews (for the current user) with pagination support
const load = async () => {
  loading.value = true;
  error.value = "";
  allReviews.value = [];
  try {
    let url: string | null = "/reviews/";
    while (url) {
      const { data } = await http.get(url);
      const items = data?.results ?? data; // paginated or plain
      allReviews.value.push(...items);
      url = data?.next || null; // DRF pagination has absolute URL; axios can handle it
    }
  } catch (e: any) {
    error.value = e?.response?.data?.detail || "Failed to load reviews";
  } finally {
    loading.value = false;
  }
};

// FRONTEND-ONLY FILTER (title match; your serializer returns `drama` as a string title)
const filtered = computed(() => {
  if (!props.dramaTitle) return [];
  const target = props.dramaTitle.toLowerCase();
  return allReviews.value.filter((r) => {
    // r.drama is a string title per your serializer's to_representation
    const titleStr =
      typeof r.drama === "string"
        ? r.drama
        : r.drama?.title ?? ""; // fallback if backend changes later
    return titleStr.toLowerCase() === target;
  });
});

onMounted(load);
watch(() => props.dramaTitle, load);

defineExpose({ load });

</script>

<template>
  <div>
    <p v-if="loading">Loading…</p>
    <p v-if="error" style="color:#b00020">{{ error }}</p>

    <ul v-if="!loading && !error" style="display:grid;gap:8px;list-style:none;padding:0">
      <li
        v-for="r in filtered"
        :key="r.id"
        style="border:1px solid #ddd;padding:8px;border-radius:8px"
      >
        <div style="opacity:.7;font-size:.9rem">
          {{ r.user }} • {{ (r.created_at || '').slice(0, 10) }}
        </div>
        <div style="font-weight:600">⭐ {{ r.rating }}/10</div>
        <p style="margin:.25rem 0 0">{{ r.content }}</p>
      </li>
      <li v-if="!loading && filtered.length === 0" style="opacity:.7">No reviews yet.</li>
    </ul>
  </div>
</template>
