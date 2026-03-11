import { NextRequest } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-context'
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  internalErrorResponse,
} from '@/lib/api-response'
import { MOCK_PATENTS } from '@/lib/mock-data'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ patentId: string }> },
) {
  try {
    const { patentId } = await params

    // 목업 모드
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      const patent = MOCK_PATENTS.find(p => p.id === patentId)
      if (!patent) return notFoundResponse()
      return successResponse({ ...patent, is_watched: true })
    }

    const ctx = await getAuthContext()
    if (isAuthError(ctx)) return ctx.error

    const { user, orgId, supabase } = ctx
    if (!orgId) return forbiddenResponse()

    // 주시 추가 (upsert — 중복 방지)
    const { error } = await supabase.from('watchlist').upsert(
      {
        org_id: orgId,
        user_id: user.id,
        patent_id: patentId,
      },
      { onConflict: 'user_id,patent_id' },
    )

    if (error) throw error

    return successResponse({ patent_id: patentId, is_watched: true })
  } catch (err) {
    console.error('[POST /api/watchlist/[patentId]]', err)
    return internalErrorResponse()
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ patentId: string }> },
) {
  try {
    const { patentId } = await params

    // 목업 모드
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      return successResponse({ patent_id: patentId, is_watched: false })
    }

    const ctx = await getAuthContext()
    if (isAuthError(ctx)) return ctx.error

    const { user, supabase } = ctx

    const { error, count } = await supabase
      .from('watchlist')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .eq('patent_id', patentId)

    if (error) throw error
    if (!count || count === 0) return notFoundResponse()

    return successResponse({ patent_id: patentId, is_watched: false })
  } catch (err) {
    console.error('[DELETE /api/watchlist/[patentId]]', err)
    return internalErrorResponse()
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ patentId: string }> },
) {
  try {
    const { patentId } = await params
    const ctx = await getAuthContext()
    if (isAuthError(ctx)) return ctx.error

    const { user, supabase } = ctx
    const body = (await request.json()) as { note?: string | null }

    const { data, error } = await supabase
      .from('watchlist')
      .update({ note: body.note ?? null })
      .eq('user_id', user.id)
      .eq('patent_id', patentId)
      .select()
      .single()

    if (error) throw error

    return successResponse(data)
  } catch (err) {
    console.error('[PATCH /api/watchlist/[patentId]]', err)
    return internalErrorResponse()
  }
}
