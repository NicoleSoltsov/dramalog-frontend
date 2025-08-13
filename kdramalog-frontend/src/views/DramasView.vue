<!-- src/views/DramasView.vue -->
<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import http from "@/api/http";
import { useAuthStore } from "@/stores/auth";

const dramas = ref<any[]>([]);
const loading = ref(true);
const error = ref("");
const successMessage = ref("");
const searchQuery = ref("");

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function fetchDramas(query = "") {
  loading.value = true;
  error.value = "";
  try {
    let url = "/dramas/";
    if (query.trim()) url += `?search=${encodeURIComponent(query)}`;
    const res = await http.get(url);
    dramas.value = res.data.sort((a: any, b: any) => b.id - a.id);
  } catch (err) {
    error.value = "Failed to load dramas";
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function runSearch() {
  const q = searchQuery.value.trim();
  router.push({ name: "dramas", query: q ? { q } : {} });
}

async function deleteDrama(id: number) {
  if (!confirm("Are you sure you want to delete this drama?")) return;
  try {
    await http.delete(`/dramas/${id}/`);
    dramas.value = dramas.value.filter((d: any) => d.id !== id);
  } catch (err) {
    console.error("Delete failed", err);
    alert("Failed to delete drama");
  }
}

function openDrama(d: any) {
  // bump clicked drama to top in current view for a nice UX
  dramas.value = [d, ...dramas.value.filter((x: any) => x.id !== d.id)];
  router.push({ name: "drama-detail", params: { id: d.id } });
}

// React to URL ?q= changes; also runs immediately on mount
watch(
  () => route.query.q,
  async (q) => {
    const val = (q as string) || "";
    searchQuery.value = val;

    // Handle "newly added" toast once
    const state = window.history.state as { newDrama?: any } | null;

    await fetchDramas(val);

    if (state?.newDrama) {
      dramas.value = [
        state.newDrama,
        ...dramas.value.filter((d: any) => d.id !== state.newDrama.id),
      ];
      successMessage.value = `"${state.newDrama.title}" added successfully!`;
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => (successMessage.value = ""), 3000);
      // clear transient state so it won't reappear on nav
      history.replaceState({}, "");
    }
  },
  { immediate: true }
);
</script>

<template>
  <div style="padding: 20px;">
    <h1>Dramas</h1>

    <!-- Success message -->
    <div
      v-if="successMessage"
      style="background: #d4edda; color: #155724; padding: 10px; border-radius: 6px; margin-bottom: 16px;"
    >
      {{ successMessage }}
    </div>

    <!-- Add Drama Button -->
    <div v-if="auth.isAuthed" style="margin-bottom: 16px;">
      <router-link
        to="/add"
        style="display: inline-block; padding: 8px 12px; background: #4caf50; color: white; border-radius: 4px; text-decoration: none;"
      >
        ➕ Add Drama
      </router-link>
    </div>

    <!-- Search Bar -->
    <div style="margin-bottom: 16px; display: flex; gap: 8px;">
      <input
        v-model="searchQuery"
        @keyup.enter="runSearch"
        placeholder="Find a drama you've added..."
        style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 6px;"
      />
      <button
        @click="runSearch"
        style="padding: 8px 12px; border: none; background: #4caf50; color: white; border-radius: 6px; cursor: pointer;"
      >
        Search
      </button>
      <button
        v-if="searchQuery"
        @click="() => { searchQuery = ''; runSearch(); }"
        style="padding: 8px 12px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 6px; cursor: pointer;"
      >
        Clear
      </button>
    </div>

    <div v-if="loading">Loading dramas...</div>
    <div v-else-if="error" style="color: red;">{{ error }}</div>

    <div v-else>
      <!-- Fixed 3-column grid, bigger posters, wider spacing -->
      <div
        style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
        "
      >
        <div
          v-for="d in dramas"
          :key="d.id"
          style="text-align: center; cursor: pointer; background: white; border-radius: 8px; padding: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);"
          @click="openDrama(d)"
        >
          <img
            :src="d.poster_url || '/placeholder.png'"
            alt="Poster"
            style="width: 100%; border-radius: 6px; height: 320px; object-fit: cover;"
          />
          <p style="margin-top: 10px; font-weight: 500; font-size: 1rem;">{{ d.title }}</p>
          <button
            v-if="auth.isAuthed"
            @click.stop="deleteDrama(d.id)"
            style="margin-top: 8px; padding: 6px 12px; background: #ff4d4d; color: white; border: none; border-radius: 4px; cursor: pointer;"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
