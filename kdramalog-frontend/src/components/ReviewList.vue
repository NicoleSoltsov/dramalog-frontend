<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import http from "@/api/http";

const props = defineProps<{ dramaTmdbId: number }>();

const allReviews = ref<any[]>([]);
const loading = ref(false);
const error = ref("");

// per-item UI state
const editingId = ref<number | null>(null);
const editContent = ref<string>("");
const editRating = ref<number>(8);
const saving = ref(false);
const deletingId = ref<number | null>(null);

// Fetch ONLY reviews for this TMDB id (handles pagination)
const load = async () => {
  if (!props.dramaTmdbId) return;
  loading.value = true;
  error.value = "";
  allReviews.value = [];
  try {
    let url: string | null = `/reviews/?drama_tmdb_id=${props.dramaTmdbId}`;
    while (url) {
      const { data } = await http.get(url);
      const items = data?.results ?? data; // paginated or plain
      allReviews.value.push(...items);
      url = data?.next || null; // DRF pagination has absolute URL
    }
    // newest first
    allReviews.value.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (e: any) {
    error.value = e?.response?.data?.detail || "Failed to load reviews";
  } finally {
    loading.value = false;
  }
};

function formatDateTime(dt: string | undefined) {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---- Edit / Delete actions ---- */
function beginEdit(r: any) {
  editingId.value = r.id;
  editContent.value = r.content ?? "";
  const n = Number(r.rating ?? 8);
  editRating.value = isNaN(n) ? 8 : Math.min(10, Math.max(1, n));
}
function cancelEdit() {
  editingId.value = null;
  editContent.value = "";
  editRating.value = 8;
}
async function saveEdit(id: number) {
  if (saving.value) return;
  saving.value = true;
  try {
    const payload: any = {
      content: (editContent.value || "").trim(),
      rating: Number(editRating.value),
    };
    if (!payload.content) throw new Error("Content cannot be empty.");
    if (payload.rating < 1 || payload.rating > 10)
      throw new Error("Rating must be between 1 and 10.");

    const { data } = await http.patch(`/reviews/${id}/`, payload);
    const idx = allReviews.value.findIndex((x) => x.id === id);
    if (idx !== -1) allReviews.value[idx] = { ...allReviews.value[idx], ...data };
    cancelEdit();
  } catch (e: any) {
    const apiErr =
      e?.response?.data?.content?.[0] ||
      e?.response?.data?.rating?.[0] ||
      e?.response?.data?.detail ||
      e?.message ||
      "Failed to save review";
    alert(apiErr);
  } finally {
    saving.value = false;
  }
}
async function deleteReview(id: number) {
  if (deletingId.value) return;
  if (!confirm("Delete this review? This cannot be undone.")) return;
  deletingId.value = id;
  try {
    await http.delete(`/reviews/${id}/`);
    allReviews.value = allReviews.value.filter((r) => r.id !== id);
    if (editingId.value === id) cancelEdit();
  } catch (e: any) {
    alert(e?.response?.data?.detail || "Failed to delete review");
  } finally {
    deletingId.value = null;
  }
}

onMounted(load);
watch(() => props.dramaTmdbId, load, { immediate: false });

defineExpose({ load });
</script>

<template>
  <div class="reviews">
    <p v-if="loading" class="muted">Loading…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <ul v-if="!loading && !error" class="list">
      <li v-for="r in allReviews" :key="r.id" class="item">
        <!-- VIEW MODE -->
        <template v-if="editingId !== r.id">
          <div class="head">
            <div class="who muted">
              {{ r.user }} • {{ formatDateTime(r.created_at) }}
            </div>
            <div class="actions">
              <button class="btn btn-ghost" @click="beginEdit(r)">Edit</button>
              <button
                class="btn btn-danger"
                :disabled="deletingId === r.id"
                @click="deleteReview(r.id)"
              >
                {{ deletingId === r.id ? "Deleting…" : "Delete" }}
              </button>
            </div>
          </div>

          <div class="rating">⭐ {{ r.rating }}/10</div>
          <div class="content">
            <p>{{ r.content }}</p>
          </div>
        </template>

        <!-- EDIT MODE -->
        <template v-else>
          <div class="muted small" style="margin-bottom:6px;">
            Editing review by {{ r.user }} • {{ formatDateTime(r.created_at) }}
          </div>

          <div class="edit-row">
            <label :for="`rating-${r.id}`" class="lbl">Rating</label>
            <input
              :id="`rating-${r.id}`"
              type="number"
              min="1"
              max="10"
              v-model.number="editRating"
              class="num"
            />
            <span class="suffix">/10</span>
          </div>

          <textarea
            v-model="editContent"
            class="area"
            rows="3"
          ></textarea>

          <div class="actions">
            <button
              class="btn btn-primary"
              :disabled="saving"
              @click="saveEdit(r.id)"
            >
              {{ saving ? "Saving…" : "Save" }}
            </button>
            <button
              class="btn btn-ghost"
              :disabled="saving"
              @click="cancelEdit"
            >
              Cancel
            </button>
          </div>
        </template>
      </li>

      <li v-if="!loading && allReviews.length === 0" class="muted">
        No reviews yet.
      </li>
    </ul>
  </div>
</template>

<style scoped>
:root, :host {
  --primary: #7c3aed;  /* purple */
  --accent:  #06b6d4;  /* cyan   */
  --ring:    rgba(124,58,237,.25);
  --danger:  #ef4444;
}

.reviews { }
.muted { color:#64748b; }
.error { color:#dc2626; font-weight:600; }

/* List layout */
.list {
  display: grid;
  gap: 12px;
  list-style: none;
  padding: 0;
}

/* Card */
.item {
  border: 2px solid #e9d5ff;
  border-radius: 12px;
  padding: 12px;
  background: linear-gradient(135deg,#faf5ff,#ecfeff);
  box-shadow: 0 4px 10px rgba(124,58,237,.06);
}

/* Header row */
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

/* Rating badge */
.rating {
  margin-top: 6px;
  font-weight: 700;
  text-align: center;
  background: linear-gradient(90deg,#8b5cf6,#06b6d4);
  color: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

/* Review body — fixed-height scroll so long reviews don't blow layout */
.content {
  margin: .35rem 0 0;
  max-height: 180px;         /* keeps box height reasonable for very long text */
  overflow: auto;
  padding-right: 6px;
}
.content p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;    /* ensure very long words/URLs wrap */
  text-align: center;
}

/* Edit mode inputs */
.edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.lbl { opacity:.85; font-weight:600; }
.num {
  width: 70px;
  padding: 6px;
  border: 2px solid #a78bfa;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  color: #4c1d95;
}
.suffix { opacity:.75; font-size:.9rem; }
.area {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #a78bfa;
  border-radius: 10px;
  background: #fff;
  outline: none;
}
.area:focus, .num:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--ring);
}

/* Buttons */
.actions { display:flex; gap:8px; align-items:center; }
.btn { padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:600; }
.btn-ghost { background:#fff; border:1px solid #d8b4fe; color:#6d28d9; }
.btn-primary { background: linear-gradient(90deg,#8b5cf6,#06b6d4); color:#fff; border:none; }
.btn-danger { background: var(--danger); color:#fff; border:none; }
.btn:disabled { opacity:.65; cursor:not-allowed; }
</style>
