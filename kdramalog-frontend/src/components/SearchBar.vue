<script setup lang="ts">
import { ref } from "vue";
import http from "@/api/http";
import { useRouter } from "vue-router";

const query = ref("");
const results = ref<any[]>([]);
const router = useRouter();
const loading = ref(false);

const search = async () => {
  if (!query.value.trim()) {
    results.value = [];
    return;
  }
  loading.value = true;
  try {
    const res = await http.get(`/dramas/?search=${encodeURIComponent(query.value)}`);
    results.value = res.data;
  } catch (err) {
    console.error(err);
    results.value = [];
  } finally {
    loading.value = false;
  }
};

const goToDrama = (drama: any) => {
  router.push({ name: "drama-detail", params: { title: drama.title } });
  results.value = [];
  query.value = "";
};
</script>

<template>
  <div style="position:relative;">
    <input
      v-model="query"
      @input="search"
      placeholder="Search your dramas..."
      style="width: 100%; padding: 8px; border: 1px solid #ccc;"
    />
    <ul v-if="results.length" style="position:absolute; top: 40px; background:white; border:1px solid #ccc; width:100%; list-style:none; margin:0; padding:0; z-index:10;">
      <li
        v-for="d in results"
        :key="d.id"
        @click="goToDrama(d)"
        style="padding:8px; cursor:pointer;"
      >
        {{ d.title }}
      </li>
    </ul>
  </div>
</template>
