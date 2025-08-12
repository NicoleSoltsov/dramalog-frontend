<script setup lang="ts">
import { ref, onMounted } from "vue";
import http from "@/api/http";

const props = defineProps<{ dramaTitle: string; total?: number }>();
const progress = ref<number>(0);
const saving = ref(false);
const error = ref("");
let statusId: number | null = null;

const ensureStatus = async () => {
  try {
    // Get all watch statuses for the current user
    const list = (await http.get(`/tracker/status/`)).data;

    // Try to find this drama's tracker record
    const item = list.find((status: any) => status.drama === props.dramaTitle);

    if (item) {
      statusId = item.id;
      progress.value = item.current_episode || 0;
    } else {
      // Create tracker record if none exists
      const created = (
        await http.post(`/tracker/status/`, {
          drama: props.dramaTitle, // backend expects title
          status: "plan", // default status
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
