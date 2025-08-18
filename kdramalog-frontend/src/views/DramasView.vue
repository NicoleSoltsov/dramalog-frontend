<!-- src/views/DramasView.vue -->
<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import http from "@/api/http";
import { useAuthStore } from "@/stores/auth";

type Drama = { id: number; title: string; tmdb_id: number; poster_url?: string };

const dramas = ref<Drama[]>([]);
const loading = ref(true);
const error = ref("");
const successMessage = ref("");
const searchQuery = ref("");

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

/* --- Bulk select state --- */
const bulkMode = ref(false);
const selected = ref<Set<number>>(new Set());
const selectedCount = computed(() => selected.value.size);
const allSelected = computed(
  () => dramas.value.length > 0 && selected.value.size === dramas.value.length
);

function toggleSelect(id: number) {
  const next = new Set(selected.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selected.value = next;
}
function toggleAll() {
  if (allSelected.value) {
    selected.value = new Set();
  } else {
    selected.value = new Set(dramas.value.map(d => d.id));
  }
}
function exitBulkMode() {
  bulkMode.value = false;
  selected.value = new Set();
}

async function fetchDramas(query = "") {
  loading.value = true;
  error.value = "";
  try {
    let url = "/dramas/";
    if (query.trim()) url += `?search=${encodeURIComponent(query)}`;
    const res = await http.get(url);
    dramas.value = (res.data?.results ?? res.data).sort((a: any, b: any) => b.id - a.id);
  } catch (err) {
    error.value = "Failed to load dramas";
    console.error(err);
  } finally {
    loading.value = false;
    // keep selection valid after refresh
    const ids = new Set(dramas.value.map(d => d.id));
    selected.value = new Set([...selected.value].filter(id => ids.has(id)));
    if (selected.value.size === 0 && bulkMode.value) {
      // if nothing left selected, auto-exit bulk mode for UX
      bulkMode.value = false;
    }
  }
}

function runSearch() {
  const q = searchQuery.value.trim();
  router.push({ name: "dramas", query: q ? { q } : {} });
}
function clearSearch() {
  searchQuery.value = "";
  runSearch();
}

async function deleteDrama(id: number) {
  if (!confirm("Are you sure you want to delete this drama?")) return;
  try {
    await http.delete(`/dramas/${id}/`);
    dramas.value = dramas.value.filter((d: any) => d.id !== id);
    selected.value.delete(id);
  } catch (err) {
    console.error("Delete failed", err);
    alert("Failed to delete drama");
  }
}

async function bulkDelete() {
  if (selected.value.size === 0) return;
  if (!confirm(`Delete ${selected.value.size} drama(s)? This cannot be undone.`)) return;
  try {
    await http.post("/dramas/bulk-delete/", {
      ids: Array.from(selected.value),
    });
    await fetchDramas(searchQuery.value);
    exitBulkMode();
    successMessage.value = "Selected dramas deleted.";
    setTimeout(() => (successMessage.value = ""), 2500);
  } catch (e: any) {
    console.error(e);
    alert(e?.response?.data?.error || "Bulk delete failed");
  }
}

function openDrama(d: Drama) {
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

    <!-- ACTIONS (top row) -->
    <div style="display:flex; gap:8px; align-items:center; margin-bottom: 12px; flex-wrap:wrap;">
      <!-- Add Drama Button -->
      <router-link
        v-if="auth.isAuthed && !bulkMode"
        to="/add"
        style="display: inline-block; padding: 8px 12px; background: #4caf50; color: white; border-radius: 6px; text-decoration: none;"
      >
        Add Drama
      </router-link>

      <!-- Bulk controls -->
      <button
        v-if="auth.isAuthed"
        @click="bulkMode ? exitBulkMode() : (bulkMode = true)"
        style="padding: 8px 12px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 6px; cursor: pointer;"
      >
        {{ bulkMode ? "Cancel" : "Select" }}
      </button>

      <button
        v-if="auth.isAuthed && bulkMode"
        @click="toggleAll"
        style="padding: 8px 12px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 6px; cursor: pointer;"
      >
        {{ allSelected ? "Unselect All" : "Select All" }}
      </button>

      <button
        v-if="auth.isAuthed && bulkMode"
        :disabled="selectedCount === 0"
        @click="bulkDelete"
        style="padding: 8px 12px; background: #ff4d4d; color: white; border: none; border-radius: 6px; cursor: pointer; opacity: var(--op, 1);"
        :style="{ '--op': selectedCount === 0 ? 0.6 : 1 }"
      >
        Delete ({{ selectedCount }})
      </button>
    </div>

    <!-- SEARCH (full width, below actions) -->
    <div style="margin-bottom: 20px;">
      <div style="display:flex; gap:8px; align-items:center;">
        <input
          v-model="searchQuery"
          @keyup.enter="runSearch"
          placeholder="Find a drama you've added..."
          style="flex:1; padding: 10px 12px; border: 1px solid #ccc; border-radius: 8px;"
        />
        <button
          @click="runSearch"
          style="padding: 10px 14px; border: none; background: #4caf50; color: white; border-radius: 8px; cursor: pointer; white-space:nowrap;"
        >
          Search
        </button>
        <button
          v-if="searchQuery"
          @click="clearSearch"
          style="padding: 10px 14px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 8px; cursor: pointer; white-space:nowrap;"
        >
          Clear
        </button>
      </div>
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
          style="text-align: center; cursor: pointer; background: white; border-radius: 8px; padding: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); position: relative;"
          @click="!bulkMode && openDrama(d)"
        >
          <!-- Checkbox in bulk mode -->
          <label v-if="bulkMode" style="position:absolute; top:10px; left:10px; background:white; border-radius:4px; padding:2px 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">
            <input
              type="checkbox"
              :checked="selected.has(d.id)"
              @change.stop="toggleSelect(d.id)"
            />
          </label>

          <img
            :src="d.poster_url || '/placeholder.png'"
            alt="Poster"
            style="width: 100%; border-radius: 6px; height: 320px; object-fit: cover;"
          />
          <p style="margin-top: 10px; font-weight: 500; font-size: 1rem;">{{ d.title }}</p>

          <!-- Single delete (still available when not in bulk mode) -->
          <button
            v-if="auth.isAuthed && !bulkMode"
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
