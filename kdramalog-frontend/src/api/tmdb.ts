// src/api/tmdb.ts
import http from "@/api/http";

export async function fetchSeasonsByDramaPk(dramaPk: number) {
  const res = await http.get(`/dramas/${dramaPk}/seasons/`);
  return res.data as {
    drama_id: number;
    tmdb_id: number;
    seasons: Array<{ season_number: number; episode_count: number; name?: string }>;
  };
}
