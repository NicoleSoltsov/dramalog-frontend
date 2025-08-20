<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import http from "@/api/http";
import { useAuthStore } from "@/stores/auth";

type Drama = { id: number; title: string; tmdb_id: number; poster_url?: string };

const dramas = ref<Drama[]>([]);
const loading = ref(true);
const error = ref("");
const successMessage = ref("");

// search
const searchQuery = ref("");

// filters (UI state)
const statusOptions = [
  { v: "plan", label: "Plan" },
  { v: "watching", label: "Watching" },
  { v: "on_hold", label: "On Hold" },
  { v: "dropped", label: "Dropped" },
  { v: "finished", label: "Finished" },
];
const selectedStatuses = ref<string[]>([]);
const genres = ref<{ id: number; name: string }[]>([]);
const selectedGenres = ref<string>(""); // single-select with "Any" default
const lengthBucket = ref<"" | "short" | "medium" | "long">("");
const decade = ref("");
const yearFrom = ref<string>("");
const yearTo = ref<string>("");
const hasReview = ref<"" | "true" | "false">("");
const sortOrder = ref<"updated" | "created" | "title">("updated");
const myRatingOrder = ref<"" | "asc" | "desc">("");

// auth / routing
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

/* ---------------- helpers: build & read query params ---------------- */
function buildQueryParams() {
  const q: Record<string, string> = {};
  if (searchQuery.value.trim()) {
    q.search = searchQuery.value.trim();
  }
  if (selectedStatuses.value.length) q.status = selectedStatuses.value.join(",");
  if (selectedGenres.value) q.genre = selectedGenres.value;
  if (lengthBucket.value) q.length = lengthBucket.value;
  if (decade.value) {
    q.year_decade = decade.value;
  } else {
    if (yearFrom.value && /^\d{4}$/.test(yearFrom.value)) q.year_from = yearFrom.value;
    if (yearTo.value && /^\d{4}$/.test(yearTo.value)) q.year_to = yearTo.value;
  }
  if (hasReview.value) q.has_review = hasReview.value;
  if (myRatingOrder.value) {
    q.my_rating_order = myRatingOrder.value;
  } else {
    q.order = sortOrder.value || "updated";
  }
  return q;
}

function applyFromRoute(query: Record<string, any>) {
  searchQuery.value = (query.search as string) || "";
  const statusStr = (query.status as string) || "";
  selectedStatuses.value = statusStr ? statusStr.split(",").map(s => s.trim()).filter(Boolean) : [];
  const genreStr = (query.genre as string) || "";
  selectedGenres.value = genreStr;
  lengthBucket.value = (query.length as "short" | "medium" | "long") || "";
  decade.value = (query.year_decade as string) || "";
  yearFrom.value = (query.year_from as string) || "";
  yearTo.value = (query.year_to as string) || "";
  const hr = (query.has_review as string) || "";
  hasReview.value = hr === "true" || hr === "false" ? (hr as "true" | "false") : "";
  const mro = (query.my_rating_order as string) || "";
  myRatingOrder.value = mro === "asc" || mro === "desc" ? (mro as "asc" | "desc") : "";
  const ord = (query.order as string) || "updated";
  sortOrder.value = ord === "created" || ord === "title" ? (ord as any) : "updated";
}

/* ---------------- fetching ---------------- */
async function fetchDramas() {
  loading.value = true;
  error.value = "";
  try {
    const params = buildQueryParams();
    const usp = new URLSearchParams(params).toString();
    const url = `/dramas/${usp ? "?" + usp : ""}`;
    const res = await http.get(url);
    // IMPORTANT FIX: do NOT force-sort by id here; let backend sorting (or rating order) apply
    dramas.value = (res.data?.results ?? res.data);
  } catch (err) {
    error.value = "Failed to load dramas";
    console.error(err);
  } finally {
    loading.value = false;
    const ids = new Set(dramas.value.map(d => d.id));
    selected.value = new Set([...selected.value].filter(id => ids.has(id)));
    if (selected.value.size === 0 && bulkMode.value) {
      bulkMode.value = false;
    }
  }
}

async function fetchGenres() {
  try {
    const res = await http.get("/dramas/my-genres/"); // returns ["Romance","Thriller",...]
    genres.value = (res.data || []).map((name: string, idx: number) => ({
      id: idx,
      name,
    }));
  } catch (err) {
    console.error("Failed to load genres", err);
    genres.value = [];
  }
}

function runSearch() {
  router.push({ name: "dramas", query: buildQueryParams() });
}
function clearSearch() {
  searchQuery.value = "";
  runSearch();
}

/* NEW: Clear all filters */
function clearFilters() {
  searchQuery.value = "";
  selectedStatuses.value = [];
  selectedGenres.value = "";
  lengthBucket.value = "";
  decade.value = "";
  yearFrom.value = "";
  yearTo.value = "";
  hasReview.value = "";
  sortOrder.value = "updated";
  myRatingOrder.value = "";

  runSearch();
}

/* Preserve filters when navigating to details */
function openDrama(d: Drama) {
  dramas.value = [d, ...dramas.value.filter((x: any) => x.id !== d.id)];
  router.push({
    name: "drama-detail",
    params: { id: d.id },
    query: route.query,
  });
}

/* Bulk delete handler */
async function bulkDelete() {
  if (selectedCount.value === 0) return;
  const confirmed = window.confirm(`Are you sure you want to delete ${selectedCount.value} drama(s)?`);
  if (!confirmed) return;

  try {
    const ids = [...selected.value];
    await http.post("/dramas/bulk-delete/", { ids });
    dramas.value = dramas.value.filter(d => !selected.value.has(d.id));
    successMessage.value = `Deleted ${ids.length} dramas.`;
    setTimeout(() => (successMessage.value = ""), 3000);
    exitBulkMode();
  } catch (err) {
    console.error(err);
    error.value = "Failed to delete dramas.";
  }
}

/* Delete single drama */
async function deleteDrama(id: number) {
  const confirmed = window.confirm("Are you sure you want to delete this drama?");
  if (!confirmed) return;

  try {
    await http.delete(`/dramas/${id}/`);
    dramas.value = dramas.value.filter(d => d.id !== id);
    successMessage.value = "Drama deleted.";
    setTimeout(() => (successMessage.value = ""), 3000);
  } catch (err) {
    console.error(err);
    error.value = "Failed to delete dramas.";
  }
}

/* react to URL changes (and on mount) */
watch(
  () => route.query,
  async (q) => {
    applyFromRoute(q as Record<string, any>);
    const state = window.history.state as { newDrama?: any } | null;
    await fetchDramas();
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

onMounted(() => {
  fetchGenres();
});
</script>

<template>
  <div style="padding: 20px;">
    <h1>Dramas</h1>

    <div
      v-if="successMessage"
      style="background: #d4edda; color: #155724; padding: 10px; border-radius: 6px; margin-bottom: 16px;"
    >
      {{ successMessage }}
    </div>

    <!-- ACTIONS -->
    <div style="display:flex; gap:8px; align-items:center; margin-bottom: 12px; flex-wrap:wrap;">
      <router-link
        v-if="auth.isAuthed && !bulkMode"
        to="/add"
        style="display: inline-block; padding: 8px 12px; background: #4caf50; color: white; border-radius: 6px; text-decoration: none;"
      >Add Drama</router-link>

      <button
        v-if="auth.isAuthed"
        @click="bulkMode ? exitBulkMode() : (bulkMode = true)"
        style="padding: 8px 12px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 6px; cursor: pointer;"
      >{{ bulkMode ? "Cancel" : "Select" }}</button>

      <button
        v-if="auth.isAuthed && bulkMode"
        @click="toggleAll"
        style="padding: 8px 12px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 6px; cursor: pointer;"
      >{{ allSelected ? "Unselect All" : "Select All" }}</button>

      <button
        v-if="auth.isAuthed && bulkMode"
        :disabled="selectedCount === 0"
        @click="bulkDelete"
        style="padding: 8px 12px; background: #ff4d4d; color: white; border: none; border-radius: 6px; cursor: pointer; opacity: var(--op, 1);"
        :style="{ '--op': selectedCount === 0 ? 0.6 : 1 }"
      >Delete ({{ selectedCount }})</button>
    </div>

    <!-- SEARCH -->
    <div style="margin-bottom: 10px;">
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
        >Search</button>
        <button
          v-if="searchQuery"
          @click="clearSearch"
          style="padding: 10px 14px; border: 1px solid #ccc; background: #f6f6f6; border-radius: 8px; cursor: pointer; white-space:nowrap;"
        >Clear</button>
      </div>
    </div>

    <!-- FILTERS -->
    <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #eee; border-radius: 8px;">
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          <span style="font-weight:600;">Status:</span>
          <label v-for="s in statusOptions" :key="s.v" style="display:flex; gap:6px; align-items:center;">
            <input type="checkbox" :value="s.v" v-model="selectedStatuses" />
            <span>{{ s.label }}</span>
          </label>
        </div>

        <div style="display:flex; gap:6px; align-items:center; min-width:240px; flex:1;">
          <span style="font-weight:600;">Genres:</span>
          <select
            v-model="selectedGenres"
            style="flex:1; padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
          >
            <option value="">Any</option>
            <option v-for="g in genres" :key="g.id" :value="g.name">{{ g.name }}</option>
          </select>
        </div>

        <div style="display:flex; gap:6px; align-items:center;">
          <span style="font-weight:600;">Length:</span>
          <select v-model="lengthBucket" style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;">
            <option value="">Any</option>
            <option value="short">≤12 eps</option>
            <option value="medium">13–24 eps</option>
            <option value="long">25+ eps</option>
          </select>
        </div>

        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          <span style="font-weight:600;">Release:</span>
          <select v-model="decade" style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;">
            <option value="">Any decade</option>
            <option>2020s</option>
            <option>2010s</option>
            <option>2000s</option>
            <option>1990s</option>
          </select>
          <span style="opacity:.7;">or</span>
          <input v-model="yearFrom" placeholder="From (yyyy)" maxlength="4" style="width:110px; padding:6px 8px; border:1px solid #ccc; border-radius:6px;" />
          <input v-model="yearTo" placeholder="To (yyyy)" maxlength="4" style="width:110px; padding:6px 8px; border:1px solid #ccc; border-radius:6px;" />
        </div>

        <div style="display:flex; gap:6px; align-items:center;">
          <span style="font-weight:600;">Has Review:</span>
          <select v-model="hasReview" style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;">
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <div style="display:flex; gap:6px; align-items:center;">
          <span style="font-weight:600;">Sort:</span>
          <select v-model="sortOrder" :disabled="!!myRatingOrder" title="Disabled when sorting by my rating" style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;">
            <option value="updated">Most Recently Updated</option>
            <option value="created">Recently Added</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>

        <div style="display:flex; gap:6px; align-items:center;">
          <span style="font-weight:600;">My Rating:</span>
          <select v-model="myRatingOrder" title="Overrides Sort" style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;">
            <option value="">—</option>
            <option value="desc">Highest → Lowest</option>
            <option value="asc">Lowest → Highest</option>
          </select>
        </div>

        <div style="margin-left:auto; display:flex; gap:8px;">
          <button
            @click="runSearch"
            style="padding:8px 12px; background:#4caf50; color:#fff; border:none; border-radius:6px; cursor:pointer;"
          >Apply Filters</button>
          <button
            @click="clearFilters"
            style="padding:8px 12px; background:#f6f6f6; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer;"
          >Clear Filters</button>
        </div>
      </div>
    </div>

    <div v-if="loading">Loading dramas...</div>
    <div v-else-if="error" style="color: red;">{{ error }}</div>

    <div v-else>
      <div
        style="
          display: flex;
          flex-wrap: wrap;
          gap: 32px;
          justify-content: center;
          width: 100%;
        "
      >
        <div
          v-for="d in dramas"
          :key="d.id"
          style="text-align: center; cursor: pointer; background: white; border-radius: 8px; padding: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); position: relative; width: 200px;"
          @click="!bulkMode && openDrama(d)"
        >
          <label v-if="bulkMode" style="position:absolute; top:10px; left:10px; background:white; border-radius:4px; padding:2px 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">
            <input type="checkbox" :checked="selected.has(d.id)" @change.stop="toggleSelect(d.id)" />
          </label>

          <img :src="d.poster_url || '/placeholder.png'" alt="Poster" style="width: 100%; border-radius: 6px; height: 320px; object-fit: cover;" />
          <p style="margin-top: 10px; font-weight: 500; font-size: 1rem;">{{ d.title }}</p>

          <button
            v-if="auth.isAuthed && !bulkMode"
            @click.stop="deleteDrama(d.id)"
            style="margin-top: 8px; padding: 6px 12px; background: #ff4d4d; color: white; border: none; border-radius: 4px; cursor: pointer;"
          >Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

