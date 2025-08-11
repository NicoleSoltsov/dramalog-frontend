<script setup lang="ts">
import { ref, onMounted } from "vue";
import http from "@/api/http";

const props = defineProps<{ dramaId: number; total?: number }>();
const progress = ref<number>(0);
const saving = ref(false);
const error = ref("");
let statusId: number | null = null;

// We'll fetch the drama title first since the API uses title for `drama` field
const dramaTitle = ref<string>("");

const ensureStatus = async () => {
  try {
    // Step 1: Get drama details so we know the title
    const dramaRes = await http.get(`/dramas/${props.dramaId}/`);
    dramaTitle.value = dramaRes.data.title;

    // Step 2: Get all watch statuses
    const list = (await http.get(`/tracker/status/`)).data;

    // Step 3: Match by title
    const item = list.find((status: any) => status.drama === dramaTitle.value);

    if (item) {
      statusId = item.id;
      progress.value = item.current_episode || 0;
    } else {
      // Step 4: Create if not found
      const created = (
        await http.post(`/tracker/status/`, {
          drama: dramaTitle.value, // backend expects title
          current_episode: 0,
        })
      ).data;
      statusId = created.id;
      progress.value = created.current_episode || 0;
    }
  } catch (e: any) {
    console.error(e);
    error.value = e?.response?.data?.detail || "Failed to load progress";
  }
};

const save = async () => {
  if (!statusId) return;
  saving.value = true;
  error.value = "";
  try {
    await http.patch(`/tracker/status/${statusId}/`, {
      current_episode: progress.value,
    });
  } catch (e: any) {
    console.error(e);
    error.value = e?.response?.data?.detail || "Failed to save";
  } finally {
    saving.value = false;
  }
};

onMounted(ensureStatus);
</script>

<template>
  <div style="margin-top:8px">
    <label style="display:block;opacity:.7;margin-bottom:4px">Your progress</label>
    <div style="display:flex;gap:8px;align-items:center">
      <input
        type="number"
        min="0"
        :max="total || 1000"
        v-model.number="progress"
        style="width:80px;padding:4px;border:1px solid #ccc;border-radius:6px"
      />
      <button
        @click="save"
        :disabled="saving"
        style="padding:6px 10px;border:1px solid #ccc;border-radius:6px"
      >
        Save
      </button>
      <span v-if="total" style="opacity:.7;font-size:.9rem">/ {{ total }}</span>
    </div>
    <div v-if="error" style="color:#b00020;margin-top:4px">{{ error }}</div>
  </div>
</template>
