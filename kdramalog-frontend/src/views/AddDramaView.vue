<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import http from "@/api/http";

const title = ref("");
const loading = ref(false);
const error = ref("");
const router = useRouter();

async function addDrama() {
  if (!title.value.trim()) {
    error.value = "Please enter a drama title.";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const res = await http.post("/kdramas/add-by-name/", { title: title.value });
    
    // Pass the new drama to the list page using router state
    router.push({ name: "dramas", state: { newDrama: res.data } });
  } catch (err: any) {
    console.error(err);
    error.value = err?.response?.data?.error || "Failed to add drama.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width: 400px; margin: 24px auto;">
    <h1>Add Drama</h1>
    <form @submit.prevent="addDrama">
      <input
        v-model="title"
        placeholder="Enter drama title"
        style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 6px;"
      />
      <button
        :disabled="loading"
        style="width: 100%; padding: 10px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer;"
      >
        {{ loading ? "Adding..." : "Add Drama" }}
      </button>
      <p v-if="error" style="color: #b00020; margin-top: 8px;">{{ error }}</p>
    </form>
  </div>
</template>