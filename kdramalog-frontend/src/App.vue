<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
const auth = useAuthStore();
</script>

<template>
  <div>
    <nav style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #ddd">
      <router-link to="/">Dramas</router-link>
      <router-link to="/add">Add</router-link>
      <span style="margin-left:auto">
        <router-link v-if="!auth.isAuthed" to="/login">Login</router-link>
        <button v-else @click="auth.logout()" style="border:1px solid #ccc;padding:4px 10px;border-radius:6px">
          Logout ({{ auth.user?.username || 'You' }})
        </button>
      </span>
    </nav>
    <router-view />
  </div>
</template>
