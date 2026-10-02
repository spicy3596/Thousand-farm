import { createClient } from '@supabase/supabase-js'

// Project connection info. The anon key is the PUBLIC / publishable key — it is
// meant to ship in the frontend; access is governed by Storage bucket policies.
// Prefer an env var if provided, otherwise fall back to the inline constant.
export const SUPABASE_PROJECT_ID = 'yvixqdmqvvlldhlzzqjr'
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2aXhxZG1xdnZsbGRobHp6cWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTU5NjYsImV4cCI6MjA5NjQzMTk2Nn0.I7SYCMP5uBtl1buRY9o2Aw7cslgy2wmfpo7kutm2c58'

export const isSupabaseConfigured = SUPABASE_ANON_KEY.length > 0

// Reuse a single client across HMR reloads to avoid "Multiple GoTrueClient
// instances" warnings. Auth persistence is off — we only use Storage.
const globalForSupabase = globalThis as unknown as {
  __growfarmSupabase?: ReturnType<typeof createClient>
  __growfarmSupabasePublic?: ReturnType<typeof createClient>
}

export const supabase =
  globalForSupabase.__growfarmSupabase ??
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'missing-key', {
    // Persist the login session so users stay signed in across reloads.
    auth: { persistSession: true, autoRefreshToken: true },
  })

globalForSupabase.__growfarmSupabase = supabase

// A session-free client for reading PUBLIC content (e.g. the shared `music`
// bucket). It never attaches the logged-in user's JWT, so Storage reads run as
// the `anon` role regardless of who is signed in — the same as before auth was
// added. Uses a separate storageKey so it can't touch the auth session above.
export const supabasePublic =
  globalForSupabase.__growfarmSupabasePublic ??
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'missing-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: 'growfarm-public-noauth',
    },
  })

globalForSupabase.__growfarmSupabasePublic = supabasePublic
