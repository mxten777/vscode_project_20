import { getAuthContext, isAuthError } from '@/lib/auth-context'
import { successResponse, internalErrorResponse } from '@/lib/api-response'
import type { WatchlistItem } from '@/lib/types'
import { MOCK_WATCHLIST } from '@/lib/mock-data'

export async function GET() {
  try {
    // 목업 모드
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      return successResponse(MOCK_WATCHLIST)
    }

    const ctx = await getAuthContext()
    if (isAuthError(ctx)) return ctx.error

    const { user, supabase } = ctx

    const { data, error } = await supabase
      .from('watchlist')
      .select(`*, patent:patents(*)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return successResponse((data ?? []) as WatchlistItem[])
  } catch (err) {
    console.error('[GET /api/watchlist]', err)
    return internalErrorResponse()
  }
}
