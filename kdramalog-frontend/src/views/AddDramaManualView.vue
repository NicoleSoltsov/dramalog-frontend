<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import http from "@/api/http";

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const error = ref("");
const form = ref({
  title: "",
  description: "",
  release_year: null as number | null,
  total_episodes: null as number | null,
  genres: [] as string[],
  moods: [] as string[],
  spotify_link: "",
  poster_url: ""
});

async function submitManualDrama() {
  loading.value = true;
  error.value = "";
  try {
    const res = await http.post("/dramas/", form.value);
    router.push({
      name: "dramas",
      query: route.query,            // <-- preserve filters on return
      state: { newDrama: res.data },
    });
  } catch (err: any) {
    console.error(err);
    error.value = err?.response?.data?.error || "Failed to add drama.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width: 500px; margin: 24px auto;">
    <h1>Add Drama Manually</h1>
    <form @submit.prevent="submitManualDrama">
      <input v-model="form.title" placeholder="Title" style="width: 100%; padding: 8px; margin-bottom: 10px;" />
      <textarea v-model="form.description" placeholder="Description" style="width: 100%; padding: 8px; margin-bottom: 10px;"></textarea>
      <input type="number" v-model.number="form.release_year" placeholder="Release Year" style="width: 100%; padding: 8px; margin-bottom: 10px;" />
      <input type="number" v-model.number="form.total_episodes" placeholder="Total Episodes" style="width: 100%; padding: 8px; margin-bottom: 10px;" />
      <input
        v-model="(form as any).genres"
        placeholder="Genres (comma separated)"
        @change="(form as any).genres = (form as any).genres.split(',').map((g: string) => g.trim())"
        style="width: 100%; padding: 8px; margin-bottom: 10px;"
      />
      <input
        v-model="(form as any).moods"
        placeholder="Moods (comma separated)"
        @change="(form as any).moods = (form as any).moods.split(',').map((m: string) => m.trim())"
        style="width: 100%; padding: 8px; margin-bottom: 10px;"
      />
      <input v-model="form.spotify_link" placeholder="Spotify OST Link" style="width: 100%; padding: 8px; margin-bottom: 10px;" />
      <input v-model="form.poster_url" placeholder="Poster URL" style="width: 100%; padding: 8px; margin-bottom: 10px;" />

      <button :disabled="loading" style="width: 100%; padding: 10px; background: #2196f3; color: white; border: none; border-radius: 6px; cursor: pointer;">
        {{ loading ? "Adding..." : "Add Drama" }}
      </button>
      <p v-if="error" style="color: #b00020; margin-top: 8px;">{{ error }}</p>
    </form>
  </div>
</template>
