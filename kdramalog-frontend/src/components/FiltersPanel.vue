<script setup lang="ts">
type StatusOpt = { v:string; label:string };

const props = defineProps<{
  statusOptions: StatusOpt[];
  genres: { id:number; name:string }[];
  languages: { code:string; name?:string }[];
  // v-model bindings
  selectedStatuses: string[];
  selectedGenres: string;
  selectedLanguage: string;
  lengthBucket: ''|'short'|'medium'|'long';
  decade: string;
  yearFrom: string;
  yearTo: string;
  hasReview: ''|'true'|'false';
  sortOrder: 'updated'|'created'|'title';
  myRatingOrder: ''|'asc'|'desc';
  disabledSort?: boolean;
}>();

const emit = defineEmits<{
  (e:'update:selectedStatuses', v:string[]):void;
  (e:'update:selectedGenres', v:string):void;
  (e:'update:selectedLanguage', v:string):void;
  (e:'update:lengthBucket', v:''|'short'|'medium'|'long'):void;
  (e:'update:decade', v:string):void;
  (e:'update:yearFrom', v:string):void;
  (e:'update:yearTo', v:string):void;
  (e:'update:hasReview', v:''|'true'|'false'):void;
  (e:'update:sortOrder', v:'updated'|'created'|'title'):void;
  (e:'update:myRatingOrder', v:''|'asc'|'desc'):void;
  (e:'apply'):void;
  (e:'clear'):void;
}>();
</script>

<template>
  <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #eee; border-radius: 8px;">
    <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        <span style="font-weight:600;">Status:</span>
        <label v-for="s in props.statusOptions" :key="s.v" style="display:flex; gap:6px; align-items:center;">
          <input
            type="checkbox"
            :value="s.v"
            :checked="props.selectedStatuses.includes(s.v)"
            @change="(e:any)=>{
              const next = new Set(props.selectedStatuses);
              e.target.checked ? next.add(s.v) : next.delete(s.v);
              emit('update:selectedStatuses', Array.from(next));
            }"
          />
          <span>{{ s.label }}</span>
        </label>
      </div>

      <div style="display:flex; gap:6px; align-items:center; min-width:240px; flex:1;">
        <span style="font-weight:600;">Genres:</span>
        <select
          :value="props.selectedGenres"
          @change="emit('update:selectedGenres', ($event.target as HTMLSelectElement).value)"
          style="flex:1; padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
        >
          <option value="">Any</option>
          <option v-for="g in props.genres" :key="g.id" :value="g.name">{{ g.name }}</option>
        </select>
      </div>

      <div style="display:flex; gap:6px; align-items:center; min-width:200px; flex:1;">
        <span style="font-weight:600;">Language:</span>
        <select
          :value="props.selectedLanguage"
          @change="emit('update:selectedLanguage', ($event.target as HTMLSelectElement).value)"
          style="flex:1; padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
        >
          <option value="">Any</option>
          <option v-for="l in props.languages" :key="l.code" :value="l.code">
            {{ l.name || l.code }}
          </option>
        </select>
      </div>

      <div style="display:flex; gap:6px; align-items:center;">
        <span style="font-weight:600;">Length:</span>
        <select
          :value="props.lengthBucket"
          @change="emit('update:lengthBucket', ($event.target as HTMLSelectElement).value as any)"
          style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
        >
          <option value="">Any</option>
          <option value="short">≤12 eps</option>
          <option value="medium">13–24 eps</option>
          <option value="long">25+ eps</option>
        </select>
      </div>

      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        <span style="font-weight:600;">Release:</span>
        <select
          :value="props.decade"
          @change="emit('update:decade', ($event.target as HTMLSelectElement).value)"
          style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
        >
          <option value="">Any decade</option>
          <option>2020s</option><option>2010s</option><option>2000s</option><option>1990s</option>
        </select>
        <span style="opacity:.7;">or</span>
        <input
          :value="props.yearFrom"
          @input="emit('update:yearFrom', ($event.target as HTMLInputElement).value)"
          placeholder="From (yyyy)" maxlength="4"
          style="width:110px; padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
        />
        <input
          :value="props.yearTo"
          @input="emit('update:yearTo', ($event.target as HTMLInputElement).value)"
          placeholder="To (yyyy)" maxlength="4"
          style="width:110px; padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
        />
      </div>

      <div style="display:flex; gap:6px; align-items:center;">
        <span style="font-weight:600;">Has Review:</span>
        <select
          :value="props.hasReview"
          @change="emit('update:hasReview', ($event.target as HTMLSelectElement).value as any)"
          style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
        >
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>

      <div style="display:flex; gap:6px; align-items:center;">
        <span style="font-weight:600;">Sort:</span>
        <select
          :value="props.sortOrder"
          :disabled="!!props.disabledSort"
          title="Disabled when sorting by my rating"
          @change="emit('update:sortOrder', ($event.target as HTMLSelectElement).value as any)"
          style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
        >
          <option value="updated">Most Recently Updated</option>
          <option value="created">Recently Added</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>

      <div style="display:flex; gap:6px; align-items:center;">
        <span style="font-weight:600;">My Rating:</span>
        <select
          :value="props.myRatingOrder"
          title="Overrides Sort"
          @change="emit('update:myRatingOrder', ($event.target as HTMLSelectElement).value as any)"
          style="padding:6px 8px; border:1px solid #ccc; border-radius:6px;"
        >
          <option value="">—</option>
          <option value="desc">Highest → Lowest</option>
          <option value="asc">Lowest → Highest</option>
        </select>
      </div>

      <div style="margin-left:auto; display:flex; gap:8px;">
        <button
          @click="emit('apply')"
          style="padding:8px 12px; background:#4caf50; color:#fff; border:none; border-radius:6px; cursor:pointer;"
        >
          Apply Filters
        </button>
        <button
          @click="emit('clear')"
          style="padding:8px 12px; background:#f6f6f6; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer;"
        >
          Clear Filters
        </button>
      </div>
    </div>
  </div>
</template>
