<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import http from "@/api/http";

type Candidate = {
  tmdb_id?: number;
  title: string;
  year?: string | number;
  overview?: string;
  poster_url?: string | null;
};

const router = useRouter();
const route = useRoute();

const title = ref("");
const loading = ref(false);
const error = ref("");

// preview state
const candidates = ref<Candidate[]>([]);
const selectedIndex = ref<number | null>(null);
const searched = ref(false);

// Try preview first; if not available, we’ll fall back to add-by-name directly
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
      error.value = "Preview not available. You can still add directly with the button below.";
      searched.value = true;
    } else {
      error.value = e?.response?.data?.detail || "Search failed. Please try again.";
    }
  } finally {
    loading.value = false;
  }
}

async function addDirect() {
  await addByName(title.value.trim());
}

async function addSelected() {
  if (selectedIndex.value === null) return;
  const pick = candidates.value[selectedIndex.value];
  await addByName(pick.title);
}

async function addByName(name: string) {
  if (!name) {
    error.value = "Please enter a drama title.";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const res = await http.post("/kdramas/add-by-name/", { title: name });
    router.push({
      name: "dramas",
      query: route.query,             // <-- keep current filters
      state: { newDrama: res.data },
    });
  } catch (err: any) {
    error.value = err?.response?.data?.error || "Failed to add drama.";
  } finally {
    loading.value = false;
  }
}

function pickIndex(i: number) {
  selectedIndex.value = i;
}
</script>

<template>
  <div style="max-width: 900px; margin: 24px auto;">
    <h1>Add Drama</h1>

    <!-- Search -->
    <form @submit.prevent="search" style="display:flex; gap:8px; margin-bottom:12px;">
      <input
        v-model="title"
        placeholder="Enter drama title"
        style="flex:1; padding: 10px; border:1px solid #ccc; border-radius:6px;"
      />
      <button
        type="submit"
        :disabled="loading"
        style="padding:10px 14px; border:1px solid #ccc; border-radius:6px;"
      >
        {{ loading ? "Searching..." : "Search" }}
      </button>
    </form>

    <p v-if="error" style="color:#b00020; margin-bottom:12px;">{{ error }}</p>

    <!-- If preview exists and returned candidates -->
    <div v-if="candidates.length">
      <p style="margin: 8px 0 12px;">Is this the right K‑drama? Pick a match and confirm.</p>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap:12px;">
        <div
          v-for="(c, i) in candidates"
          :key="c.tmdb_id || c.title + i"
          @click="pickIndex(i)"
          :style="{
            border: i === selectedIndex ? '2px solid #4caf50' : '1px solid #ddd',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            background: i === selectedIndex ? '#f0fff4' : 'white'
          }"
        >
          <img
            v-if="c.poster_url"
            :src="c.poster_url"
            alt="Poster"
            style="width:100%; height:300px; object-fit:cover; border-radius:6px; margin-bottom:8px;"
          />
          <div style="font-weight:700; margin-bottom:4px;">
            {{ c.title }}
            <span v-if="c.year" style="opacity:.7">({{ c.year }})</span>
          </div>
          <div style="font-size:.92rem; opacity:.85; max-height:4.6em; overflow:hidden;">
            {{ c.overview || "No summary available." }}
          </div>
        </div>
      </div>

      <div style="display:flex; gap:8px; margin-top:16px;">
        <button
          @click="addSelected"
          :disabled="loading || selectedIndex===null"
          style="padding:10px 14px; background:#4caf50; color:white; border:none; border-radius:6px; cursor:pointer;"
        >
          {{ loading ? "Adding..." : "Yes, add this one" }}
        </button>
        <button
          type="button"
          @click="() => { candidates = []; selectedIndex = null; }"
          style="padding:10px 14px; border:1px solid #ccc; border-radius:6px; background:#f6f6f6; cursor:pointer;"
        >
          No, search again
        </button>
      </div>
    </div>

    <!-- If preview isn’t available (or user hasn’t searched yet), show direct add -->
    <div v-else-if="searched" style="margin-top:16px;">
      <button
        @click="addDirect"
        :disabled="loading || !title.trim()"
        style="padding:10px 14px; background:#4caf50; color:white; border:none; border-radius:6px; cursor:pointer;"
      >
        {{ loading ? "Adding..." : "Add directly" }}
      </button>
    </div>

    <!-- Manual add link -->
    <div style="margin-top: 16px; text-align: center;">
      <router-link
        :to="{ name: 'add-drama-manual' }"
        style="color: #2196f3; text-decoration: underline; font-size: 0.9rem;"
      >
        Can't find your drama? Add it manually
      </router-link>
    </div>
  </div>
</template>
