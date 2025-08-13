// src/stores/auth.ts
import { defineStore } from "pinia";
import http from "@/api/http";

type Me = { id: number; username: string };

function extractToken(data: any) {
  // Accept common token shapes: JWT ("access"), DRF token ("token"), DRF authtoken ("key")
  const token = data?.access || data?.token || data?.key || "";
  // Decide scheme automatically
  const scheme: "Bearer" | "Token" = data?.access ? "Bearer" : "Token";
  return { token, scheme };
}

export const useAuthStore = defineStore("auth", {
  state: () => {
    const token = localStorage.getItem("token") || "";
    const scheme = (localStorage.getItem("scheme") as "Bearer" | "Token") || "Bearer";

    // Keep axios header in sync on startup
    if (token) {
      (http.defaults.headers as any).Authorization = `${scheme} ${token}`;
    }

    return {
      token,
      scheme,
      user: null as Me | null,
    };
  },

  getters: {
    isAuthed: (s) => !!s.token,
  },

  actions: {
    _setAuth(token: string, scheme: "Bearer" | "Token") {
      this.token = token;
      this.scheme = scheme;
      localStorage.setItem("token", token);
      localStorage.setItem("scheme", scheme);
      (http.defaults.headers as any).Authorization = `${scheme} ${token}`;
    },

    _clearAuth() {
      this.token = "";
      this.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("scheme");
      delete (http.defaults.headers as any).Authorization;
    },

    async _loadMe(fallbackUsername?: string) {
      try {
        this.user = (await http.get("/users/me/")).data as Me;
      } catch {
        // Fallback if /me is unavailable
        if (fallbackUsername) this.user = { id: 0, username: fallbackUsername };
      }
    },

    async login(username: string, password: string) {
      const { data } = await http.post("/users/login/", { username, password });

      const { token, scheme } = extractToken(data);
      if (!token) throw new Error("No token returned from backend");

      this._setAuth(token, scheme);
      await this._loadMe(username);
    },

    async register(username: string, password: string, email?: string) {
      // Hit your register endpoint
      const { data } = await http.post("/users/register/", { username, password, email });

      // If register returned a token, use it; otherwise, auto-login
      const { token, scheme } = extractToken(data);
      if (token) {
        this._setAuth(token, scheme);
        await this._loadMe(username);
      } else {
        await this.login(username, password);
      }
    },

    async logout() {
      try {
        await http.post("/users/logout/");
      } catch {
        // ignore backend logout errors
      }
      this._clearAuth();
    },
  },
});
