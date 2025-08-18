<!-- src/components/ReviewList.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import http from "@/api/http";

const props = defineProps<{ dramaTitle: string }>(); // or accept dramaId if you prefer

const allReviews = ref<any[]>([]);
const loading = ref(false);
const error = ref("");

// per-item UI state
const editingId = ref<number | null>(null);
const editContent = ref<string>("");
const editRating = ref<number>(8);
const saving = ref(false);
const deletingId = ref<number | null>(null);

// Fetch ALL reviews (for the current user) with pagination support
const load = async () => {
  loading.value = true;
  error.value = "";
  allReviews.value = [];
  try {
    let url: string | null = "/reviews/";
    while (url) {
      const { data } = await http.get(url);
      const items = data?.results ?? data; // paginated or plain
      allReviews.value.push(...items);
      url = data?.next || null; // DRF pagination has absolute URL; axios can handle it
    }
  } catch (e: any) {
    error.value = e?.response?.data?.detail || "Failed to load reviews";
  } finally {
    loading.value = false;
  }
};

// FRONTEND-ONLY FILTER (title match) + SORT NEWEST FIRST
const filtered = computed(() => {
  if (!props.dramaTitle) return [];
  const target = props.dramaTitle.toLowerCase();

  return allReviews.value
    .filter((r) => {
      const titleStr =
        typeof r.drama === "string" ? r.drama : r.drama?.title ?? "";
      return titleStr.toLowerCase() === target;
    })
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta; // newest first
    });
});

// Nice date-time for display
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
  // coerce to 1..10 boundaries to be safe
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
    // basic client-side validation
    if (!payload.content) throw new Error("Content cannot be empty.");
    if (payload.rating < 1 || payload.rating > 10) {
      throw new Error("Rating must be between 1 and 10.");
    }

    const { data } = await http.patch(`/reviews/${id}/`, payload);
    // update in local list
    const idx = allReviews.value.findIndex((x) => x.id === id);
    if (idx !== -1) {
      allReviews.value[idx] = { ...allReviews.value[idx], ...data };
    }
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
watch(() => props.dramaTitle, load);

defineExpose({ load });
</script>

<template>
  <div>
    <p v-if="loading">Loading…</p>
    <p v-if="error" style="color:#b00020">{{ error }}</p>

    <ul v-if="!loading && !error" style="display:grid;gap:8px;list-style:none;padding:0">
      <li
        v-for="r in filtered"
        :key="r.id"
        style="border:1px solid #ddd;padding:8px;border-radius:8px"
      >
        <!-- VIEW MODE -->
        <template v-if="editingId !== r.id">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div style="opacity:.7;font-size:.9rem">
              {{ r.user }} • {{ formatDateTime(r.created_at) }}
            </div>
            <div style="display:flex; gap:8px;">
              <button
                @click="beginEdit(r)"
                style="padding:6px 10px; border:1px solid #ccc; background:#f6f6f6; border-radius:6px; cursor:pointer;"
              >
                Edit
              </button>
              <button
                :disabled="deletingId === r.id"
                @click="deleteReview(r.id)"
                style="padding:6px 10px; border:none; background:#ff4d4d; color:white; border-radius:6px; cursor:pointer; opacity: var(--op, 1);"
                :style="{ '--op': deletingId === r.id ? 0.6 : 1 }"
              >
                {{ deletingId === r.id ? "Deleting…" : "Delete" }}
              </button>
            </div>
          </div>

          <div style="font-weight:600; margin-top:6px;">⭐ {{ r.rating }}/10</div>
          <p style="margin:.25rem 0 0; white-space:pre-wrap;">{{ r.content }}</p>
        </template>

        <!-- EDIT MODE -->
        <template v-else>
          <div style="opacity:.7;font-size:.9rem; margin-bottom:6px;">
            Editing review by {{ r.user }} • {{ formatDateTime(r.created_at) }}
          </div>

          <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
            <label for="rating-{{r.id}}">Rating</label>
            <input
              :id="`rating-${r.id}`"
              type="number"
              min="1"
              max="10"
              v-model.number="editRating"
              style="width:70px;padding:4px;border:1px solid #ccc;border-radius:6px"
            />
            <span style="opacity:.7;font-size:.9rem">/10</span>
          </div>

          <textarea
            v-model="editContent"
            style="width:100%;padding:8px;margin:8px 0;border:1px solid #ccc;border-radius:6px"
            rows="3"
          ></textarea>

          <div style="display:flex; gap:8px;">
            <button
              :disabled="saving"
              @click="saveEdit(r.id)"
              style="padding:6px 12px; border:1px solid #2e7d32; background:#43a047; color:white; border-radius:6px; cursor:pointer; opacity: var(--op, 1);"
              :style="{ '--op': saving ? 0.7 : 1 }"
            >
              {{ saving ? "Saving…" : "Save" }}
            </button>
            <button
              :disabled="saving"
              @click="cancelEdit"
              style="padding:6px 12px; border:1px solid #ccc; background:#f6f6f6; border-radius:6px; cursor:pointer;"
            >
              Cancel
            </button>
          </div>
        </template>
      </li>

      <li v-if="!loading && filtered.length === 0" style="opacity:.7">No reviews yet.</li>
    </ul>
  </div>
</template>
