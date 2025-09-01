<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import http from "@/api/http";
import { useAuthStore } from "@/stores/auth";

/* NEW components */
import DramaCard from "@/components/DramaCard.vue";
import DramasToolbar from "@/components/DramasToolbar.vue";
import SearchBar from "@/components/SearchBar.vue";
import FiltersPanel from "@/components/FiltersPanel.vue";

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
const selectedGenres = ref<string>("");

// language filter
const languages = ref<{ code: string; name?: string }[]>([]);
const selectedLanguage = ref<string>("");

const lengthBucket = ref<"" | "short" | "medium" | "long">("");
const decade = ref("");
const yearFrom = ref<string>("");
const yearTo = ref<string>("");

const hasReview = ref<"" | "true" | "false">("");
const sortOrder = ref<"updated" | "created" | "title">("updated");
const myRatingOrder = ref<"" | "asc" | "desc">("");

// show/hide filters
const showFilters = ref(true);

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
  if (allSelected.value) selected.value = new Set();
  else selected.value = new Set(dramas.value.map(d => d.id));
}
function exitBulkMode() {
  bulkMode.value = false;
  selected.value = new Set();
}

/* ---------------- helpers: build & read query params ---------------- */
function buildQueryParams() {
  const q: Record<string, string> = {};
  if (searchQuery.value.trim()) q.search = searchQuery.value.trim();
  if (selectedStatuses.value.length) q.status = selectedStatuses.value.join(",");
  if (selectedGenres.value) q.genre = selectedGenres.value;
  if (selectedLanguage.value) q.language = selectedLanguage.value;
  if (lengthBucket.value) q.length = lengthBucket.value;
  if (decade.value) q.year_decade = decade.value;
  else {
    if (yearFrom.value && /^\d{4}$/.test(yearFrom.value)) q.year_from = yearFrom.value;
    if (yearTo.value && /^\d{4}$/.test(yearTo.value)) q.year_to = yearTo.value;
  }
  if (hasReview.value) q.has_review = hasReview.value;

  if (myRatingOrder.value) q.my_rating_order = myRatingOrder.value;
  else q.order = sortOrder.value || "updated";
  return q;
}

function applyFromRoute(query: Record<string, any>) {
  searchQuery.value = (query.search as string) || "";
  const statusStr = (query.status as string) || "";
  selectedStatuses.value = statusStr ? statusStr.split(",").map(s => s.trim()).filter(Boolean) : [];
  selectedGenres.value = (query.genre as string) || "";
  selectedLanguage.value = (query.language as string) || "";
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
    dramas.value = (res.data?.results ?? res.data);
  } catch (err) {
    error.value = "Failed to load dramas";
    console.error(err);
  } finally {
    loading.value = false;
    const ids = new Set(dramas.value.map(d => d.id));
    selected.value = new Set([...selected.value].filter(id => ids.has(id)));
    if (selected.value.size === 0 && bulkMode.value) bulkMode.value = false;
  }
}

async function fetchGenres() {
  try {
    const res = await http.get("/dramas/my-genres/");
    genres.value = (res.data || []).map((name: string, idx: number) => ({ id: idx, name }));
    if (selectedGenres.value && !genres.value.some(g => g.name === selectedGenres.value)) {
      selectedGenres.value = "";
      runSearch();
    }
  } catch (err) {
    console.error("Failed to load genres", err);
    genres.value = [];
  }
}

async function fetchLanguages() {
  try {
    const res = await http.get("/dramas/my-languages/");
    const arr = (res.data || []) as any[];
    languages.value = arr.map((item: any) =>
      typeof item === "string" ? { code: item, name: item } : { code: item.code, name: item.name || item.code }
    );
    if (selectedLanguage.value && !languages.value.some(l => l.code === selectedLanguage.value)) {
      selectedLanguage.value = "";
      runSearch();
    }
  } catch (err) {
    console.error("Failed to load languages", err);
    languages.value = [];
  }
}

function runSearch() {
  router.push({ name: "dramas", query: buildQueryParams() });
}
function clearSearch() {
  searchQuery.value = "";
  runSearch();
}
function clearFilters() {
  searchQuery.value = "";
  selectedStatuses.value = [];
  selectedGenres.value = "";
  selectedLanguage.value = "";
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
  router.push({ name: "drama-detail", params: { id: d.id }, query: route.query });
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
    await Promise.all([fetchLanguages(), fetchGenres()]);
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
    await Promise.all([fetchLanguages(), fetchGenres()]);
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
      dramas.value = [state.newDrama, ...dramas.value.filter((d: any) => d.id !== state.newDrama.id)];
      await Promise.all([fetchLanguages(), fetchGenres()]);
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
  fetchLanguages();
});
</script>

<template>
  <div style="padding: 20px;">
    <h1>My Dramas</h1>

    <div
      v-if="successMessage"
      style="background: #d4edda; color: #155724; padding: 10px; border-radius: 6px; margin-bottom: 16px;"
    >
      {{ successMessage }}
    </div>

    <!-- TOOLBAR -->
    <DramasToolbar
      :authed="auth.isAuthed"
      :bulkMode="bulkMode"
      :allSelected="allSelected"
      :selectedCount="selectedCount"
      @toggle-bulk="bulkMode ? exitBulkMode() : (bulkMode = true)"
      @toggle-all="toggleAll"
      @bulk-delete="bulkDelete"
    />

    <!-- SEARCH -->
    <SearchBar
      v-model="searchQuery"
      @search="runSearch"
      @clear="clearSearch"
    />

    <!-- FILTERS TOGGLE -->
    <div style="display:flex; justify-content:flex-end; margin-bottom:8px;">
      <button
        @click="showFilters = !showFilters"
        style="padding:6px 10px; border:1px solid #ccc; background:#f6f6f6; border-radius:6px; cursor:pointer;"
      >
        {{ showFilters ? "Hide Filters" : "Show Filters" }}
      </button>
    </div>

    <!-- FILTERS -->
    <FiltersPanel
      v-show="showFilters"
      :statusOptions="statusOptions"
      :genres="genres"
      :languages="languages"
      :disabledSort="!!myRatingOrder"
      v-model:selectedStatuses="selectedStatuses"
      v-model:selectedGenres="selectedGenres"
      v-model:selectedLanguage="selectedLanguage"
      v-model:lengthBucket="lengthBucket"
      v-model:decade="decade"
      v-model:yearFrom="yearFrom"
      v-model:yearTo="yearTo"
      v-model:hasReview="hasReview"
      v-model:sortOrder="sortOrder"
      v-model:myRatingOrder="myRatingOrder"
      @apply="runSearch"
      @clear="clearFilters"
    />

    <div v-if="loading">Loading dramas...</div>
    <div v-else-if="error" style="color: red;">{{ error }}</div>

    <div v-else>
      <div style="display: flex; flex-wrap: wrap; gap: 32px; justify-content: center; width: 100%;">
        <DramaCard
          v-for="d in dramas"
          :key="d.id"
          :drama="d"
          :bulkMode="bulkMode"
          :selected="selected.has(d.id)"
          :authed="auth.isAuthed"
          @open="openDrama"
          @toggle="toggleSelect"
          @delete="deleteDrama"
        />
      </div>
    </div>
  </div>
</template>
