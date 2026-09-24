import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Chat lives entirely in Supabase's own Postgres (see backend's
// 20260924_chat_schema.sql) — this client talks to it directly for
// conversations/messages/realtime, authenticated via a session minted by
// POST /chat/token (see chat.service.ts) rather than Supabase's own
// email/password login. Auth state is intentionally not persisted to
// localStorage here (persistSession: false) — the platform's own auth
// (auth-store) is the source of truth for "is this user logged in"; the
// Supabase session is just a derived credential re-minted on demand by
// ensureSupabaseSession().
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

let sessionPromise: Promise<void> | null = null;

/**
 * Ensures the Supabase client holds a valid session for the current platform
 * user, minting one via the backend on first call. Safe to call repeatedly —
 * concurrent callers share the in-flight mint instead of each firing their
 * own /chat/token request.
 */
export async function ensureSupabaseSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { chatService } = await import('@/services/chat.service');
      const { access_token, refresh_token } = await chatService.fetchToken();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
    })().finally(() => {
      sessionPromise = null;
    });
  }

  return sessionPromise;
}

export function clearSupabaseSession(): void {
  void supabase.auth.signOut();
}
