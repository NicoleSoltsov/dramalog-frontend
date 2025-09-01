<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import http from "@/api/http";
import ReviewList from "@/components/ReviewList.vue";
import ReviewForm from "@/components/ReviewForm.vue";
import ProgressTracker from "@/components/ProgressTracker.vue";
import JournalPanel from "@/components/JournalPanel.vue";

const route = useRoute();
const router = useRouter();

const id = Number(route.params.id);
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
  router.push({ name: "dramas", query: route.query });
}

onMounted(loadDrama);
</script>

<template>
  <div class="page">
    <div class="topbar">
      <button class="btn btn-ghost" @click="backToList">← Back to Dramas</button>
    </div>

    <p v-if="loading">Loading…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="drama" class="container">
      <!-- HEADER -->
      <section class="card header">
        <img
          v-if="drama.poster_url"
          :src="drama.poster_url"
          class="poster"
        />
        <div class="header-main">
          <h2 class="title">{{ drama.title }}</h2>

          <div class="subcard">
            <h3 class="section-title">Progress</h3>
            <ProgressTracker
              :dramaPk="id"
              :tmdbId="Number(drama.tmdb_id)"
              :total="Number(drama.total_episodes || 0)"
            />
          </div>

          <div class="subcard">
            <h3 class="section-title">Journal</h3>
            <JournalPanel :dramaPk="id" :tmdbId="Number(drama.tmdb_id)" />
          </div>
        </div>
      </section>

      <!-- REVIEWS -->
      <section class="card">
        <h3 class="section-title">Reviews</h3>
        <ReviewForm :dramaTmdbId="Number(drama.tmdb_id)" @submitted="refreshReviews" />
        <ReviewList ref="reviewListRef" :dramaTmdbId="Number(drama.tmdb_id)" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 20px;
  background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
  min-height: 100vh;
}
.topbar {
  margin-bottom: 16px;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
}

/* Cards */
.card {
  border: none;
  border-radius: 14px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,.05);
}
.header {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  align-items: start;
}
@media (max-width: 800px) {
  .header { grid-template-columns: 1fr; }
}
.poster {
  width: 220px;
  height: 320px;
  object-fit: cover;
  border-radius: 12px;
}
.header-main {
  display: grid;
  gap: 16px;
}
.title {
  margin: 0;
  line-height: 1.3;
  font-size: 1.8rem;
  color: #1f2937;
}
.subcard {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  background: #f9fafb;
}
.section-title {
  margin: 0 0 10px 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #374151;
}

/* Buttons */
.btn {
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}
.btn-ghost {
  border: 1px solid #d1d5db;
  background: #fff;
}
.btn-ghost:hover {
  background: #f3f4f6;
}

/* Messages */
.error { color: #dc2626; font-weight: 500; }
</style>
