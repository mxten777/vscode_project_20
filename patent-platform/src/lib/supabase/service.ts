import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service Role 클라이언트 — Cron jobs 전용
 * RLS를 우회하므로 내부 시스템 작업에만 사용
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
