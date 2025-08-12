<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import http from "@/api/http";

type Candidate = {
  tmdb_id?: number;
  title: string;
  year?: string | number;
  overview?: string;
  poster_url?: string | null;
};

const title = ref("");
const loading = ref(false);
const error = ref("");
const router = useRouter();

const candidates = ref<Candidate[]>([]);
const selectedIndex = ref<number | null>(null);
const searched = ref(false);

async function search() {
  error.value = "";
  candidates.value = [];
  selectedIndex.value = null;
  searched.value = false;

  const q = title.value.trim();
  if (!q) {
    error.value = "Please enter a drama title.";
    return;
  }

  loading.value = true;
  try {
    const { data } = await http.get("/kdramas/search/", { params: { q } });
    searched.value = true;

    if (Array.isArray(data) && data.length > 0) {
      candidates.value = data;
      selectedIndex.value = 0;
    } else {
      error.value = "No matches found. Try another title.";
    }
  } catch (e: any) {
    if (e?.response?.status === 404) {
      error.value = "Preview not available.";
    } else {
      error.value = e?.response?.data?.detail || "Search failed. Please try again.";
    }
  } finally {
    loading.value = false;
  }
}

function pickIndex(i: number) {
  selectedIndex.value = i;
}

async function addSelected(index?: number | null) {
  const idx = index ?? selectedIndex.value;
  if (idx === null || idx === undefined) return;
  const pick = candidates.value[idx];
  if (!pick) return;
  await addByName(pick.title, pick.tmdb_id);
}

async function addByName(name: string, tmdbId?: number) {
  if (!name) {
    error.value = "Please enter a drama title.";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const res = await http.post("/kdramas/add-by-name/", {
      title: name,
      tmdb_id: tmdbId ?? null,
    });
    router.push({ name: "dramas", state: { newDrama: res.data } });
  } catch (err: any) {
    error.value = err?.response?.data?.error || "Failed to add drama.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width: 400px; margin: 24px auto;">
    <h1>Add Drama</h1>

    <!-- Search -->
    <form @submit.prevent="search">
      <input
        v-model="title"
        placeholder="Enter drama title"
        style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 6px;"
      />
      <button
        type="submit"
        :disabled="loading"
        style="width: 100%; padding: 10px; background: #e0e0e0; color: #222; border: none; border-radius: 6px; cursor: pointer;"
      >
        {{ loading ? "Searching..." : "Search" }}
      </button>
      <p v-if="error" style="color: #b00020; margin-top: 8px;">{{ error }}</p>
    </form>

    <!-- Preview -->
    <div v-if="candidates.length" style="margin-top:12px;">
      <p style="margin: 8px 0;">Is this the right K‑drama?</p>

      <div
        v-if="selectedIndex !== null"
        style="border:1px solid #ddd; border-radius:8px; padding:10px;"
      >
        <img
          v-if="candidates[selectedIndex].poster_url"
          :src="candidates[selectedIndex].poster_url!"
          alt="Poster"
          style="width:100%; height:260px; object-fit:contain; background-color:#f8f8f8; border-radius:6px; margin-bottom:8px;"
        />
        <div style="font-weight:700; margin-bottom:4px;">
          {{ candidates[selectedIndex].title }}
          <span v-if="candidates[selectedIndex].year" style="opacity:.7">
            ({{ candidates[selectedIndex].year }})
          </span>
        </div>
        <div style="font-size:.92rem; opacity:.85; max-height:4.6em; overflow:hidden;">
          {{ candidates[selectedIndex].overview || "No summary available." }}
        </div>

        <div style="display:flex; gap:8px; margin-top:10px;">
          <button
            @click="addSelected(selectedIndex)"
            :disabled="loading"
            style="flex:1; padding:10px; background:#4caf50; color:white; border:none; border-radius:6px; cursor:pointer;"
          >
            {{ loading ? "Adding..." : "Yes" }}
          </button>
          <button
            type="button"
            @click="selectedIndex = (selectedIndex + 1) % candidates.length"
            style="flex:1; padding:10px; background:#e0e0e0; color:#222; border:none; border-radius:6px; cursor:pointer;"
          >
            See next
          </button>
        </div>
      </div>

      <!-- Quick list to jump to other candidates -->
      <div style="margin-top:10px;">
        <div
          v-for="(c, i) in candidates"
          :key="c.tmdb_id || c.title + i"
          @click="pickIndex(i)"
          :style="{
            border: i === selectedIndex ? '2px solid #4caf50' : '1px solid #eee',
            borderRadius: '6px',
            padding: '8px',
            cursor: 'pointer',
            marginBottom: '6px',
            background: i === selectedIndex ? '#f0fff4' : 'white'
          }"
        >
          {{ c.title }} <span v-if="c.year" style="opacity:.7">({{ c.year }})</span>
        </div>
      </div>
    </div>

    <!-- Manual add link -->
    <div style="margin-top: 12px; text-align: center;">
      <router-link
        :to="{ name: 'add-drama-manual' }"
        style="color: #2196f3; text-decoration: underline; font-size: 0.9rem;"
      >
        Can't find your drama? Add it manually
      </router-link>
    </div>
  </div>
</template>
