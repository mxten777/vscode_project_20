import { NextRequest } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-context'
import { alertRuleCreateSchema } from '@/lib/validations'
import {
  successResponse,
  validationErrorResponse,
  forbiddenResponse,
  internalErrorResponse,
} from '@/lib/api-response'
import type { AlertRule } from '@/lib/types'
import { MOCK_ALERT_RULES } from '@/lib/mock-data'

export async function GET() {
  try {
    // 목업 모드
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      return successResponse(MOCK_ALERT_RULES)
    }

    const ctx = await getAuthContext()
    if (isAuthError(ctx)) return ctx.error

    const { user, supabase } = ctx

    const { data, error } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return successResponse((data ?? []) as AlertRule[])
  } catch (err) {
    console.error('[GET /api/alerts/rules]', err)
    return internalErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (isAuthError(ctx)) return ctx.error

    const { user, orgId, supabase } = ctx
    if (!orgId) return forbiddenResponse()

    const body: unknown = await request.json()
    const parsed = alertRuleCreateSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors)
    }

    const { data, error } = await supabase
      .from('alert_rules')
      .insert({
        org_id: orgId,
        user_id: user.id,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) throw error

    return successResponse(data as AlertRule, 201)
  } catch (err) {
    console.error('[POST /api/alerts/rules]', err)
    return internalErrorResponse()
  }
}
