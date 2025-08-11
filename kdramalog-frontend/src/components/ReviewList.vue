<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import http from "@/api/http";

const props = defineProps<{ dramaId:number }>();
const reviews = ref<any[]>([]); const loading = ref(false); const error = ref("");

const load = async () => {
  loading.value = true; error.value = "";
  try {
    const { data } = await http.get(`/reviews/?drama=${props.dramaId}`); // backend should support ?drama=
    reviews.value = data.results || data;
  } catch (e:any) { error.value = e?.response?.data?.detail || "Failed to load reviews"; }
  finally { loading.value = false; }
};

onMounted(load);
watch(() => props.dramaId, load);
</script>

<template>
  <div>
    <p v-if="loading">Loading…</p>
    <p v-if="error" style="color:#b00020">{{ error }}</p>
    <ul v-if="!loading && !error" style="display:grid;gap:8px">
      <li v-for="r in reviews" :key="r.id" style="border:1px solid #ddd;padding:8px;border-radius:8px">
        <div style="opacity:.7;font-size:.9rem">{{ r.user?.username }} • {{ (r.created_at||'').slice(0,10) }}</div>
        <div style="font-weight:600">⭐ {{ r.rating }}/10</div>
        <p>{{ r.content }}</p>
      </li>
    </ul>
  </div>
</template>
