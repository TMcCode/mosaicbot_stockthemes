import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

const inflightByCode = new Map<string, Promise<{ error: AuthError | null }>>();

/**
 * Deduplicate PKCE `/auth/callback?code=` handling. React Strict Mode (default in Next.js dev)
 * mounts client effects twice — a second `exchangeCodeForSession` runs after the first already
 * consumed the code verifier → "PKCE code verifier not found in storage".
 */
export function exchangePkceCodeOnce(client: SupabaseClient, code: string): Promise<{ error: AuthError | null }> {
  let task = inflightByCode.get(code);
  if (!task) {
    task = client.auth.exchangeCodeForSession(code).then(({ error }) => ({ error }));
    inflightByCode.set(code, task);
    task.finally(() => {
      inflightByCode.delete(code);
    });
  }
  return task;
}
