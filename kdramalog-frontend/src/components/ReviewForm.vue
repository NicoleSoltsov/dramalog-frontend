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
  <form @submit.prevent="submit" class="review-form">
    <div class="rating-row">
      <label for="rating">Rating</label>
      <input
        id="rating"
        type="number"
        min="1"
        max="10"
        v-model.number="rating"
        class="rating-input"
      />
      <span class="rating-suffix">/10</span>
    </div>

    <textarea
      v-model="content"
      placeholder="Your thoughts…"
      class="review-textarea"
    ></textarea>

    <div class="actions">
      <button :disabled="saving" class="btn-submit">
        {{ saving ? "Posting…" : "Post" }}
      </button>
      <span v-if="error" class="error">{{ error }}</span>
    </div>
  </form>
</template>

<style scoped>
.review-form {
  margin-bottom: 12px;
  display: grid;
  gap: 12px;
}

/* Rating row */
.rating-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.rating-input {
  width: 70px;
  padding: 6px;
  border: 2px solid #a78bfa; /* purple */
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  color: #4c1d95;
}
.rating-suffix {
  opacity: 0.7;
  font-size: 0.9rem;
}

/* Textarea */
.review-textarea {
  width: 100%;
  padding: 10px;
  border: 2px solid #a78bfa;
  border-radius: 10px;
  font-size: 1rem;
  resize: vertical;
  min-height: 80px;
  background: #faf5ff; /* lavender */
}

/* Actions */
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn-submit {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #8b5cf6, #ec4899); /* purple → pink */
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  opacity: 0.9;
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #dc2626;
  font-weight: 500;
}
</style>
