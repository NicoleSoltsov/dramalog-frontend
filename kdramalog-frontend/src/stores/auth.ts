// src/stores/auth.ts
import { defineStore } from "pinia";
import http from "@/api/http";

type Me = { id: number; username: string };

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || "",
    scheme: localStorage.getItem("scheme") || "Bearer", // or "Token"
    user: null as Me | null,
  }),
  getters: { isAuthed: (s) => !!s.token },
  actions: {
    async login(username: string, password: string) {
      const { data } = await http.post("/users/login/", { username, password });

      // ✅ Accept common token formats: JWT ("access"), DRF token ("token"), DRF authtoken ("key")
      const token = data?.access || data?.token || data?.key;

      if (!token) {
        throw new Error("No token returned from backend");
      }

      // ✅ Decide scheme automatically
      this.scheme = data?.access ? "Bearer" : "Token";

      this.token = token;
      localStorage.setItem("token", this.token);
      localStorage.setItem("scheme", this.scheme);

      try {
        this.user = (await http.get("/users/me/")).data;
      } catch {
        // Fallback if /me route is unavailable
        this.user = { id: 0, username };
      }
    },

    async logout() {
      try {
        await http.post("/users/logout/");
      } catch {
        // ignore backend logout errors
      }
      this.token = "";
      this.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("scheme");
    },
  },
});
