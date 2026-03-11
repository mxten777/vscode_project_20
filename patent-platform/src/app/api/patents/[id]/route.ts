import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'
import { calcDaysToExpiry } from '@/lib/helpers'
import type { Patent } from '@/lib/types'
import { MOCK_PATENTS, MOCK_WATCHLIST } from '@/lib/mock-data'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    // 목업 모드
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      const patent = MOCK_PATENTS.find(p => p.id === id)
      if (!patent) return notFoundResponse()
      const is_watched = MOCK_WATCHLIST.some(w => w.patent_id === id)
      return successResponse({ ...patent, is_watched })
    }

    const supabase = await createClient()

    // 특허 + 출원인 조인
    const { data: patent, error } = await supabase
      .from('patents')
      .select(`*, applicant:applicants(*)`)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!patent) return notFoundResponse()

    // 현재 사용자 주시 여부 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let is_watched = false
    if (user) {
      const { data: watchItem } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('patent_id', id)
        .maybeSingle()
      is_watched = Boolean(watchItem)
    }

    const enriched: Patent = {
      ...(patent as Patent),
      is_watched,
      days_to_expiry: calcDaysToExpiry(patent.expiry_date ?? null),
    }

    return successResponse(enriched)
  } catch (err) {
    console.error('[GET /api/patents/[id]]', err)
    return internalErrorResponse()
  }
}
