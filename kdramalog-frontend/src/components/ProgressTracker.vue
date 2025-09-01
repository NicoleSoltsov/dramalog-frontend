<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import http from "@/api/http";
import { fetchSeasonsByDramaPk } from "@/api/tmdb";

interface Props {
  dramaPk: number;
  tmdbId: number;
  total?: number;
}
const props = defineProps<Props>();

const current = ref(0);
const status = ref<"plan" | "watching" | "on_hold" | "dropped" | "finished">("plan");
const season = ref<number | null>(null);

const seasons = ref<Array<{ season_number: number; episode_count: number; name?: string }>>([]);
const episodes = ref<number[]>([]);

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const isEditing = ref(true);
const hasRecord = ref(false);

const STATUS_LABELS: Record<typeof status.value, string> = {
  plan: "Plan to Watch",
  watching: "Watching",
  on_hold: "On Hold",
  dropped: "Dropped",
  finished: "Finished",
};

function hasValidId(id: any) { return typeof id === "number" && isFinite(id) && id > 0; }

const loadStatus = async () => {
  if (!hasValidId(props.tmdbId)) { error.value = "Invalid TMDB id"; return; }
  loading.value = true; error.value = "";
  try {
    const res = await http.get("/tracker/status/", { params: { drama_id: props.tmdbId } });
    if (Array.isArray(res.data) && res.data.length) {
      const row = res.data[0];
      current.value = Number(row.current_episode ?? 0);
      status.value = (row.status ?? "plan");
      season.value = (row.current_season ?? null);
      hasRecord.value = true;
      isEditing.value = false;
    } else {
      current.value = 0;
      status.value = "plan";
      season.value = null;
      hasRecord.value = false;
      isEditing.value = true;
    }
  } catch (e: any) {
    error.value = e?.response?.data?.detail || "Failed to load progress";
  } finally { loading.value = false; }
};

const loadSeasons = async () => {
  if (!hasValidId(props.dramaPk)) { error.value = "Invalid drama PK"; return; }
  try {
    const { seasons: s } = await fetchSeasonsByDramaPk(props.dramaPk);
    seasons.value = [...s].sort((a, b) => (a.season_number ?? 0) - (b.season_number ?? 0));
    if (season.value == null && seasons.value.length) {
      const firstReal = seasons.value.find(x => (x.season_number ?? 0) > 0) || seasons.value[0];
      season.value = firstReal.season_number ?? 1;
    }
    updateEpisodeOptions();
  } catch (e: any) {
    error.value = e?.response?.data?.error || "Failed to load seasons";
  }
};

function updateEpisodeOptions() {
  const s = seasons.value.find(x => x.season_number === season.value);
  const count = s?.episode_count ?? 0;
  episodes.value = Array.from({ length: count }, (_, i) => i + 1);
  if (!episodes.value.includes(current.value)) current.value = episodes.value.length ? episodes.value[0] : 0;
}

const saveStatus = async () => {
  if (!hasValidId(props.tmdbId)) { error.value = "Invalid TMDB id"; return; }
  saving.value = true; error.value = "";
  try {
    await http.post("/tracker/status/", {
      drama: props.tmdbId,
      status: status.value,
      current_season: season.value ?? 1,
      current_episode: current.value,
    });
    hasRecord.value = true;
    isEditing.value = false;
  } catch (e: any) {
    const data = e?.response?.data;
    error.value =
      data?.drama?.[0] || data?.status?.[0] || data?.current_episode?.[0] ||
      data?.current_season?.[0] || data?.detail || "Failed to save progress";
  } finally { saving.value = false; }
};

watch(season, updateEpisodeOptions);
watch(() => props.dramaPk, async () => { await loadSeasons(); });
watch(() => props.tmdbId, async () => { await loadStatus(); });

onMounted(async () => {
  await Promise.all([loadStatus(), loadSeasons()]);
});
</script>

<template>
  <div class="tracker">
    <div v-if="loading">Loading progress…</div>

    <!-- DISPLAY -->
    <div v-else-if="!isEditing" class="display">
      <div class="pill"><strong>Status:</strong> {{ STATUS_LABELS[status] }}</div>
      <div v-if="season !== null" class="pill"><strong>Season:</strong> {{ season === 0 ? 'Specials' : season }}</div>
      <div class="pill"><strong>Episode:</strong> {{ current }}</div>

      <button class="btn btn-ghost" type="button" @click="isEditing = true">Edit</button>
      <span v-if="error" class="error">{{ error }}</span>
    </div>

    <!-- EDIT -->
    <div v-else class="edit">
      <div class="field">
        <label>Watch Status</label>
        <select v-model="status" class="select">
          <option value="plan">Plan to Watch</option>
          <option value="watching">Watching</option>
          <option value="on_hold">On Hold</option>
          <option value="dropped">Dropped</option>
          <option value="finished">Finished</option>
        </select>
      </div>

      <div class="field">
        <label>Season</label>
        <select v-model="season" class="select" @change="updateEpisodeOptions">
          <option v-for="s in seasons" :key="s.season_number" :value="s.season_number">
            {{ (s.season_number ?? 0) === 0 ? 'Specials' : `Season ${s.season_number}` }}
          </option>
        </select>
      </div>

      <div class="field">
        <label>Episode</label>
        <select v-model="current" class="select">
          <option v-for="ep in episodes" :key="ep" :value="ep">Episode {{ ep }}</option>
        </select>
      </div>

      <div class="actions">
        <button class="btn btn-primary" @click="saveStatus" :disabled="saving">
          {{ saving ? "Saving…" : "Save" }}
        </button>
        <button
          v-if="hasRecord"
          type="button"
          class="btn btn-ghost"
          @click="isEditing = false"
          :disabled="saving"
        >
          Cancel
        </button>
        <span v-if="error" class="error">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tracker { display:grid; gap:8px; }
.display { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.pill {
  background:#f4f6f8; border:1px solid #e5e7eb; border-radius:999px; padding:6px 10px; font-size:.95rem;
}
.edit { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; }
.field { display:grid; gap:4px; min-width: 160px; }
.select { padding:8px; border:1px solid #ccc; border-radius:8px; }
.actions { display:flex; gap:8px; align-items:center; }
.btn { padding:8px 12px; border:1px solid #ccc; border-radius:8px; background:#f6f6f6; cursor:pointer; }
.btn-ghost { background:#fff; }
.btn-primary { border-color:#2e7d32; background:#43a047; color:#fff; }
.error { color:#b00020; }
</style>
