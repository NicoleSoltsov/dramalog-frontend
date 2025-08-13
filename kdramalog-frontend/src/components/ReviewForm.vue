<script setup lang="ts">
import { ref } from "vue";
import http from "@/api/http";

const props = defineProps<{ dramaTmdbId: number }>();
const emit = defineEmits<{ (e: "submitted"): void }>();

const rating = ref(8);
const content = ref("");
const saving = ref(false);
const error = ref("");

const submit = async () => {
  saving.value = true;
  error.value = "";
  try {
    await http.post("/reviews/", {
      drama: props.dramaTmdbId, // send tmdb_id, not title
      rating: rating.value,
      content: content.value,
    });
    content.value = "";
    rating.value = 8;
    emit("submitted");
  } catch (e: any) {
    const data = e?.response?.data;
    error.value =
      data?.drama?.[0] ||
      data?.rating?.[0] ||
      data?.content?.[0] ||
      data?.detail ||
      "Could not post review";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="submit" style="margin-bottom:12px">
    <div style="display:flex;gap:8px;align-items:center">
      <label for="rating">Rating</label>
      <input
        id="rating"
        type="number"
        min="1"
        max="10"
        v-model.number="rating"
        style="width:70px;padding:4px;border:1px solid #ccc;border-radius:6px"
      />
      <span style="opacity:.7;font-size:.9rem">/10</span>
    </div>

    <textarea
      v-model="content"
      placeholder="Your thoughts…"
      style="width:100%;padding:8px;margin:8px 0;border:1px solid #ccc;border-radius:6px"
    ></textarea>

    <button :disabled="saving" style="padding:8px 12px;border:1px solid #ccc;border-radius:6px">
      {{ saving ? "Posting…" : "Post" }}
    </button>
    <span v-if="error" style="color:#b00020;margin-left:8px">{{ error }}</span>
  </form>
</template>
