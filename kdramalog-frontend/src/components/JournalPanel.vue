<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import http from "@/api/http";
import { fetchSeasonsByDramaPk } from "@/api/tmdb";

type Entry = {
  id: number;
  user: number;
  user_display?: string;
  drama: number; // tmdb_id
  season: number;
  episode: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

const props = defineProps<{ dramaPk: number; tmdbId: number }>();

const loading = ref(false);
const error = ref("");
const saving = ref(false);

const seasons = ref<Array<{ season_number: number; episode_count: number; name?: string }>>([]);
const episodes = ref<number[]>([]);

const selectedSeason = ref<number | null>(null);
const selectedEpisode = ref<number>(1);

const title = ref("");
const content = ref("");

const entries = ref<Entry[]>([]);
const listLoading = ref(false);
const listError = ref("");

const editingId = ref<number | null>(null);
const editTitle = ref("");
const editContent = ref("");

function hasValidId(id: any) { return typeof id === "number" && isFinite(id) && id > 0; }

async function loadSeasons() {
  if (!hasValidId(props.dramaPk)) return;
  try {
    const { seasons: s } = await fetchSeasonsByDramaPk(props.dramaPk);
    seasons.value = [...s].sort((a, b) => (a.season_number ?? 0) - (b.season_number ?? 0));
    if (selectedSeason.value == null && seasons.value.length) {
      const firstReal = seasons.value.find(x => (x.season_number ?? 0) > 0) || seasons.value[0];
      selectedSeason.value = firstReal.season_number ?? 1;
    }
    updateEpisodeOptions();
  } catch (e: any) {
    error.value = e?.response?.data?.error || "Failed to load seasons";
  }
}

function updateEpisodeOptions() {
  const s = seasons.value.find(x => x.season_number === selectedSeason.value);
  const count = s?.episode_count ?? 0;
  episodes.value = Array.from({ length: count }, (_, i) => i + 1);
  if (!episodes.value.includes(selectedEpisode.value)) {
    selectedEpisode.value = episodes.value.length ? episodes.value[0] : 1;
  }
}

async function loadEntries() {
  if (!hasValidId(props.tmdbId)) return;
  listLoading.value = true; listError.value = "";
  try {
    const params = new URLSearchParams({ drama_tmdb_id: String(props.tmdbId) });
    if (selectedSeason.value != null) params.set("season", String(selectedSeason.value));
    const { data } = await http.get(`/tracker/journals/?${params.toString()}`);
    entries.value = data?.results ?? data ?? [];
  } catch (e: any) {
    listError.value = e?.response?.data?.detail || "Failed to load journal entries";
  } finally {
    listLoading.value = false;
  }
}

async function createEntry() {
  if (!content.value.trim() && !title.value.trim()) return;
  if (!hasValidId(props.tmdbId)) return;
  saving.value = true; error.value = "";
  try {
    const payload = {
      drama: props.tmdbId,
      season: selectedSeason.value ?? 1,
      episode: selectedEpisode.value || 1,
      title: title.value.trim(),
      content: content.value.trim(),
    };
    const { data } = await http.post("/tracker/journals/", payload);
    entries.value = [data, ...entries.value];
    title.value = "";
    content.value = "";
  } catch (e: any) {
    const d = e?.response?.data;
    error.value =
      d?.drama?.[0] || d?.season?.[0] || d?.episode?.[0] ||
      d?.title?.[0] || d?.content?.[0] ||
      d?.detail || "Failed to save entry";
  } finally {
    saving.value = false;
  }
}

function beginEdit(e: Entry) {
  editingId.value = e.id;
  editTitle.value = e.title || "";
  editContent.value = e.content || "";
}
function cancelEdit() {
  editingId.value = null;
  editTitle.value = "";
  editContent.value = "";
}

async function saveEdit(id: number) {
  if (!id) return;
  saving.value = true;
  try {
    const payload: Partial<Entry> = {
      title: editTitle.value.trim(),
      content: editContent.value.trim(),
    };
    const { data } = await http.patch(`/tracker/journals/${id}/`, payload);
    const idx = entries.value.findIndex(x => x.id === id);
    if (idx !== -1) entries.value[idx] = { ...entries.value[idx], ...data };
    cancelEdit();
  } catch (e: any) {
    alert(e?.response?.data?.detail || "Failed to update entry");
  } finally {
    saving.value = false;
  }
}

async function deleteEntry(id: number) {
  if (!confirm("Delete this journal entry?")) return;
  try {
    await http.delete(`/tracker/journals/${id}/`);
    entries.value = entries.value.filter(e => e.id !== id);
    if (editingId.value === id) cancelEdit();
  } catch (e: any) {
    alert(e?.response?.data?.detail || "Failed to delete entry");
  }
}

watch(selectedSeason, async () => {
  updateEpisodeOptions();
  await loadEntries();
});
watch(() => props.dramaPk, async () => { await loadSeasons(); });
watch(() => props.tmdbId, async () => { await loadEntries(); });

onMounted(async () => {
  await Promise.all([loadSeasons()]);
  await loadEntries();
});
</script>

<template>
  <div class="journal">
    <!-- Compose -->
    <div class="compose">
      <div class="row">
        <div class="field">
          <label>Season</label>
          <select v-model="selectedSeason" class="select">
            <option v-for="s in seasons" :key="s.season_number" :value="s.season_number">
              {{ (s.season_number ?? 0) === 0 ? 'Specials' : `Season ${s.season_number}` }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>Episode</label>
          <select v-model="selectedEpisode" class="select">
            <option v-for="ep in episodes" :key="ep" :value="ep">Ep {{ ep }}</option>
          </select>
        </div>
      </div>

      <input v-model="title" class="input" placeholder="Entry title (optional)…" />
      <textarea
        v-model="content"
        class="textarea"
        rows="4"
        placeholder="Your thoughts about this episode…"
      ></textarea>

      <div class="actions">
        <button class="btn" :disabled="saving" @click="createEntry">
          {{ saving ? "Saving…" : "Add Entry" }}
        </button>
        <span v-if="error" class="error">{{ error }}</span>
      </div>
    </div>

    <!-- List -->
    <div class="list">
      <div v-if="listLoading">Loading journal…</div>
      <p v-if="listError" class="error">{{ listError }}</p>

      <ul v-if="!listLoading && !listError" class="items">
        <li v-for="e in entries" :key="e.id" class="item">
          <!-- view -->
          <template v-if="editingId !== e.id">
            <div class="item-head">
              <div class="meta">
                <span class="chip">S{{ e.season }}E{{ e.episode }}</span>
                <span class="muted">• {{ new Date(e.created_at).toLocaleString() }}</span>
                <span v-if="e.user_display" class="muted">• {{ e.user_display }}</span>
              </div>
              <div class="item-actions">
                <button class="btn btn-ghost" @click="beginEdit(e)">Edit</button>
                <button class="btn btn-danger" @click="deleteEntry(e.id)">Delete</button>
              </div>
            </div>

            <div v-if="e.title" class="entry-title">{{ e.title }}</div>
            <div class="entry-content">
              <p>{{ e.content }}</p>
            </div>
          </template>

          <!-- edit -->
          <template v-else>
            <div class="muted small">Editing S{{ e.season }}E{{ e.episode }} • {{ new Date(e.created_at).toLocaleString() }}</div>
            <input v-model="editTitle" class="input" placeholder="Title (optional)" />
            <textarea v-model="editContent" class="textarea" rows="4"></textarea>
            <div class="item-actions">
              <button class="btn btn-primary" :disabled="saving" @click="saveEdit(e.id)">{{ saving ? "Saving…" : "Save" }}</button>
              <button class="btn btn-ghost" :disabled="saving" @click="cancelEdit">Cancel</button>
            </div>
          </template>
        </li>

        <li v-if="!entries.length" class="muted">No journal entries yet.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.journal { display: grid; gap: 12px; }
.compose {
  border: 1px solid #e8e8e8; border-radius: 10px; padding: 12px; background:#fff;
}
.row { display:flex; gap:12px; flex-wrap:wrap; }
.field { display:grid; gap:4px; min-width: 160px; }
.input, .select, .textarea {
  width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 8px;
}
.actions { display:flex; gap:8px; align-items:center; margin-top:8px; }
.list { }
.items { list-style:none; padding:0; display:grid; gap:10px; }
.item {
  border:1px solid #eee; border-radius:10px; padding:10px; background:#fff;
}
.item-head { display:flex; justify-content:space-between; gap:8px; align-items:center; }
.item-actions { display:flex; gap:8px; }
.meta { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.chip { background:#eef6ff; color:#1e66f5; border-radius:999px; padding:2px 8px; font-size:.85rem; }
.muted { opacity:.7; }
.small { font-size:.9rem; }

/* fixed-height scroll so long content doesn't blow layout */
.entry-content {
  margin-top: 4px; max-height: 160px; overflow: auto; padding-right: 6px;
}
.entry-content p { margin: 0; white-space: pre-wrap; overflow-wrap:anywhere; word-break: break-word; }

/* Buttons */
.btn { padding:8px 12px; border:1px solid #ccc; border-radius:8px; background:#f6f6f6; cursor:pointer; }
.btn-ghost { background:#fff; }
.btn-primary { border-color:#2e7d32; background:#43a047; color:#fff; }
.btn-danger { border:none; background:#ff4d4d; color:#fff; }
.error { color:#b00020; }
</style>
