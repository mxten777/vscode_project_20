import { NextRequest } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-context'
import { alertRuleUpdateSchema } from '@/lib/validations'
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api-response'
import type { AlertRule } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext()
    if (isAuthError(ctx)) return ctx.error

    const { user, supabase } = ctx

    const body: unknown = await request.json()
    const parsed = alertRuleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors)
    }

    const { data, error } = await supabase
      .from('alert_rules')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return notFoundResponse()
      throw error
    }

    return successResponse(data as AlertRule)
  } catch (err) {
    console.error('[PATCH /api/alerts/rules/[id]]', err)
    return internalErrorResponse()
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext()
    if (isAuthError(ctx)) return ctx.error

    const { user, supabase } = ctx

    const { error, count } = await supabase
      .from('alert_rules')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    if (!count || count === 0) return notFoundResponse()

    return successResponse({ id, deleted: true })
  } catch (err) {
    console.error('[DELETE /api/alerts/rules/[id]]', err)
    return internalErrorResponse()
  }
}
