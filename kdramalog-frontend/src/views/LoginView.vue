<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const username = ref(""); const password = ref("");
const loading = ref(false); const error = ref("");
const router = useRouter(); const auth = useAuthStore();

const submit = async () => {
  error.value = ""; loading.value = true;
  try { await auth.login(username.value, password.value); router.push({ name: "dramas" }); }
  catch (e:any) { error.value = e?.response?.data?.detail || "Login failed"; }
  finally { loading.value = false; }
};
</script>

<template>
  <div style="max-width:360px;margin:24px auto">
    <h1>Log in</h1>
    <form @submit.prevent="submit">
      <input v-model="username" placeholder="Username" style="width:100%;padding:8px;margin:8px 0;border:1px solid #ccc;border-radius:6px" />
      <input v-model="password" type="password" placeholder="Password" style="width:100%;padding:8px;margin:8px 0;border:1px solid #ccc;border-radius:6px" />
      <button :disabled="loading" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px">
        {{ loading ? "Signing in..." : "Sign in" }}
      </button>
      <p v-if="error" style="color:#b00020;margin-top:8px">{{ error }}</p>
    </form>
  </div>
</template>
