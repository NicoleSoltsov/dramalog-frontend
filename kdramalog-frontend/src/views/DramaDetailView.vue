<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import http from "@/api/http";
import ReviewList from "@/components/ReviewList.vue";
import ReviewForm from "@/components/ReviewForm.vue";
import ProgressTracker from "@/components/ProgressTracker.vue";

const route = useRoute();
const router = useRouter();

const id = Number(route.params.id); // internal Drama PK
const drama = ref<any>(null);
const loading = ref(false);
const error = ref("");

const reviewListRef = ref<InstanceType<typeof ReviewList> | null>(null);

const loadDrama = async () => {
  loading.value = true;
  error.value = "";
  try {
    drama.value = (await http.get(`/dramas/${id}/`)).data;
  } catch (e: any) {
    error.value = e?.response?.data?.detail || "Failed to load drama";
  } finally {
    loading.value = false;
  }
};

const refreshReviews = () => {
  reviewListRef.value?.load();
};

function backToList() {
  // preserve filters / search in URL when returning
  router.push({ name: "dramas", query: route.query });
}

onMounted(loadDrama);
</script>

<template>
  <div style="padding:16px">
    <button
      @click="backToList"
      style="margin-bottom:12px;padding:6px 10px;border:1px solid #ccc;border-radius:6px;background:#f6f6f6;cursor:pointer"
    >
      ← Back to Dramas
    </button>

    <p v-if="loading">Loading…</p>
    <p v-if="error" style="color:#b00020">{{ error }}</p>

    <div v-if="drama">
      <div style="display:flex;gap:16px;align-items:flex-start">
        <img
          v-if="drama.poster_url"
          :src="drama.poster_url"
          style="width:180px;height:260px;object-fit:cover;border-radius:8px"
        />
        <div>
          <h2 style="margin:0 0 6px">{{ drama.title }}</h2>

          <ProgressTracker
            :dramaPk="id"
            :tmdbId="Number(drama.tmdb_id)"
            :total="Number(drama.total_episodes || 0)"
          />
        </div>
      </div>

      <section style="margin-top:24px">
        <h3>Reviews</h3>
        <ReviewForm :dramaTmdbId="Number(drama.tmdb_id)" @submitted="refreshReviews" />
        <!-- Pass TMDB id (fixes duplicate-by-title issue) -->
        <ReviewList ref="reviewListRef" :dramaTmdbId="Number(drama.tmdb_id)" />
      </section>
    </div>
  </div>
</template>
