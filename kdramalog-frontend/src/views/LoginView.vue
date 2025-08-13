<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const mode = ref<"login" | "signup">("login"); // NEW
const username = ref("");
const password = ref("");
const confirmPassword = ref(""); // only used in signup
const email = ref(""); // optional, use if your backend accepts it

const loading = ref(false);
const error = ref("");
const router = useRouter();
const auth = useAuthStore();

const isSignup = computed(() => mode.value === "signup");

const submit = async () => {
  error.value = "";
  loading.value = true;

  try {
    if (isSignup.value) {
      if (password.value.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      if (password.value !== confirmPassword.value) {
        throw new Error("Passwords do not match.");
      }
      await auth.register(username.value.trim(), password.value, email.value.trim() || undefined);
      router.push({ name: "dramas" });
    } else {
      await auth.login(username.value.trim(), password.value);
      router.push({ name: "dramas" });
    }
  } catch (e: any) {
    // DRF validation messages often come as {field: ["msg"]} or {detail: "..."}
    const apiMsg =
      e?.response?.data?.detail ||
      (typeof e?.response?.data === "object"
        ? Object.entries(e.response.data)
            .map(([k, v]) => `${k}: ${(Array.isArray(v) ? v.join(", ") : v) as string}`)
            .join(" | ")
        : "") ||
      e?.message ||
      "Request failed";
    error.value = apiMsg;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div style="max-width:360px;margin:24px auto">
    <h1>{{ isSignup ? "Create account" : "Log in" }}</h1>

    <form @submit.prevent="submit">
      <input
        v-model="username"
        placeholder="Username"
        autocomplete="username"
        style="width:100%;padding:8px;margin:8px 0;border:1px solid #ccc;border-radius:6px"
      />

      <input
        v-if="isSignup"
        v-model="email"
        type="email"
        placeholder="Email (optional)"
        autocomplete="email"
        style="width:100%;padding:8px;margin:8px 0;border:1px solid #ccc;border-radius:6px"
      />

      <input
        v-model="password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
        style="width:100%;padding:8px;margin:8px 0;border:1px solid #ccc;border-radius:6px"
      />

      <input
        v-if="isSignup"
        v-model="confirmPassword"
        type="password"
        placeholder="Confirm password"
        autocomplete="new-password"
        style="width:100%;padding:8px;margin:8px 0;border:1px solid #ccc;border-radius:6px"
      />

      <button :disabled="loading" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px">
        {{ loading ? (isSignup ? "Creating..." : "Signing in...") : (isSignup ? "Create account" : "Sign in") }}
      </button>

      <p v-if="error" style="color:#b00020;margin-top:8px">{{ error }}</p>
    </form>

    <p style="margin-top:12px;text-align:center">
      <span v-if="isSignup">
        Already have an account?
        <a href="#" @click.prevent="mode = 'login'">Sign in</a>
      </span>
      <span v-else>
        New here?
        <a href="#" @click.prevent="mode = 'signup'">Create an account</a>
      </span>
    </p>
  </div>
</template>
