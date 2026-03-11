import { NextRequest } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-context'
import { successResponse, internalErrorResponse } from '@/lib/api-response'
import type { AlertLog } from '@/lib/types'
import { MOCK_ALERT_LOGS } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  try {
    // 목업 모드
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      return successResponse(MOCK_ALERT_LOGS)
    }

    const ctx = await getAuthContext()
    if (isAuthError(ctx)) return ctx.error

    const { user, supabase } = ctx
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? '50')

    const { data, error } = await supabase
      .from('alert_logs')
      .select(`*, alert_rule:alert_rules!inner(user_id, name, type), patent:patents(id, title, source_patent_id)`)
      .eq('alert_rule.user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(Math.min(limit, 200))

    if (error) throw error

    return successResponse((data ?? []) as AlertLog[])
  } catch (err) {
    console.error('[GET /api/alerts/logs]', err)
    return internalErrorResponse()
  }
}
