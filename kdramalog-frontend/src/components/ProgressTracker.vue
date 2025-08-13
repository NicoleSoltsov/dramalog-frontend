<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import http from "@/api/http";
import { fetchSeasonsByDramaPk } from "@/api/tmdb";

interface Props {
  dramaPk: number;         // internal Drama PK (for /dramas/:pk/seasons/)
  tmdbId: number;          // TMDB id (for tracker/status save/load)
  total?: number;          // optional: display-only fallback
}
const props = defineProps<Props>();

const current = ref(0); // current episode
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
    // Your backend currently expects TMDB id in `drama_id` for GET
    const res = await http.get("/tracker/status/", { params: { drama_id: props.tmdbId } });
    if (Array.isArray(res.data) && res.data.length) {
      const row = res.data[0];
      current.value = Number(row.current_episode ?? 0);
      status.value = (row.status ?? "plan");
      season.value = row.season ?? null; // if your backend returns season (optional)
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
    // sort ascending; also keep "specials" (#0) if present
    seasons.value = [...s].sort((a, b) => (a.season_number ?? 0) - (b.season_number ?? 0));

    // initialize season if not set (prefer first real season > 0)
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

  // clamp current episode to valid range of selected season
  if (!episodes.value.includes(current.value)) {
    current.value = episodes.value.length ? episodes.value[0] : 0;
  }
}

const saveStatus = async () => {
  if (!hasValidId(props.tmdbId)) { error.value = "Invalid TMDB id"; return; }
  saving.value = true; error.value = "";
  try {
    // Your backend expects POST with:
    // drama: TMDB id, status, current_episode, (optionally) season
    await http.post("/tracker/status/", {
      drama: props.tmdbId,
      status: status.value,
      current_episode: current.value,
      season: season.value ?? undefined,
    });
    hasRecord.value = true;
    isEditing.value = false;
  } catch (e: any) {
    const data = e?.response?.data;
    error.value =
      data?.drama?.[0] || data?.status?.[0] || data?.current_episode?.[0] ||
      data?.detail || "Failed to save progress";
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
  <div style="margin-top:8px">
    <div v-if="loading">Loading progress…</div>

    <!-- DISPLAY MODE -->
    <div v-else-if="!isEditing" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <span><strong>Watch Status:</strong> {{ STATUS_LABELS[status] }}</span>
      <span v-if="season !== null"><strong>Season:</strong> {{ season === 0 ? 'Specials' : season }}</span>
      <span><strong>Current Episode:</strong> {{ current }}</span>
      <button
        type="button"
        @click="isEditing = true"
        style="padding:4px 10px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer"
      >
        Edit
      </button>
      <span v-if="error" style="color:#b00020;margin-left:6px">{{ error }}</span>
    </div>

    <!-- EDIT MODE -->
    <div v-else style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <label style="opacity:.8">Watch Status:</label>
      <select v-model="status">
        <option value="plan">Plan to Watch</option>
        <option value="watching">Watching</option>
        <option value="on_hold">On Hold</option>
        <option value="dropped">Dropped</option>
        <option value="finished">Finished</option>
      </select>

      <label style="opacity:.8;margin-left:8px">Season:</label>
      <select v-model="season" @change="updateEpisodeOptions">
        <option
          v-for="s in seasons"
          :key="s.season_number"
          :value="s.season_number"
        >
          {{ (s.season_number ?? 0) === 0 ? 'Specials' : `Season ${s.season_number}` }}
          <!-- Optional: show (s.name) -->
        </option>
      </select>

      <label style="opacity:.8;margin-left:8px">Episode:</label>
      <select v-model="current">
        <option v-for="ep in episodes" :key="ep" :value="ep">Episode {{ ep }}</option>
      </select>

      <button @click="saveStatus" :disabled="saving">
        {{ saving ? "Saving…" : "Save" }}
      </button>

      <button
        v-if="hasRecord"
        type="button"
        @click="isEditing = false"
        :disabled="saving"
        style="padding:4px 10px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer"
      >
        Cancel
      </button>

      <span v-if="error" style="color:#b00020;margin-left:6px">{{ error }}</span>
    </div>
  </div>
</template>
