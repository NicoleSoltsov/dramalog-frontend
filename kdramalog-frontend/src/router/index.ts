import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// direct imports = simpler debugging; change to lazy later if you like
import LoginView from "@/views/LoginView.vue";
import DramasView from "@/views/DramasView.vue";
import DramaDetailView from "@/views/DramaDetailView.vue";
import AddDramaView from "@/views/AddDramaView.vue";

const routes = [
  { path: "/login", name: "login", component: LoginView },
  { path: "/", name: "dramas", component: DramasView, meta: { requiresAuth: true } },
  { path: "/dramas/:id", name: "drama-detail", component: DramaDetailView, meta: { requiresAuth: true } },
  { path: "/add", name: "add-drama", component: AddDramaView, meta: { requiresAuth: true } },
  {path: '/add-drama-manual', name: 'add-drama-manual', component: () => import('@/views/AddDramaManualView.vue')}
  
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthed) return { name: "login" };
});

export default router;
