import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { patentSearchSchema } from '@/lib/validations'
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/api-response'
import type { Patent, PaginatedResponse } from '@/lib/types'
import { MOCK_PATENTS } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const rawParams = Object.fromEntries(searchParams.entries())
    const parsed = patentSearchSchema.safeParse(rawParams)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors)
    }

    // 목업 모드: 필터링 후 페이지네이션 적용
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      const { q, status, applicantName, page, pageSize } = parsed.data
      let filtered = [...MOCK_PATENTS]
      if (q) filtered = filtered.filter(p => p.title.includes(q) || (p.applicant_name ?? '').includes(q))
      if (status) filtered = filtered.filter(p => p.status === status)
      if (applicantName) filtered = filtered.filter(p => (p.applicant_name ?? '').includes(applicantName))
      const total = filtered.length
      const data = filtered.slice((page - 1) * pageSize, page * pageSize)
      return successResponse<PaginatedResponse<Patent>>({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
    }

    const {
      q,
      status,
      source,
      ipcCode,
      applicantName,
      inventorName,
      filingDateFrom,
      filingDateTo,
      expiryDays,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = parsed.data

    const supabase = await createClient()
    const offset = (page - 1) * pageSize

    // count 쿼리와 data 쿼리를 병렬 실행
    const buildBaseQuery = () => {
      let q2 = supabase.from('patents').select('*', { count: 'exact' })

      if (q) {
        q2 = q2.or(`title.ilike.%${q}%,applicant_name.ilike.%${q}%`)
      }
      if (status) {
        q2 = q2.eq('status', status)
      }
      if (source) {
        q2 = q2.eq('source', source)
      }
      if (ipcCode) {
        q2 = q2.contains('ipc_codes', [ipcCode])
      }
      if (applicantName) {
        q2 = q2.ilike('applicant_name', `%${applicantName}%`)
      }
      if (inventorName) {
        q2 = q2.contains('inventor_names', [inventorName])
      }
      if (filingDateFrom) {
        q2 = q2.gte('filing_date', filingDateFrom)
      }
      if (filingDateTo) {
        q2 = q2.lte('filing_date', filingDateTo)
      }
      if (expiryDays) {
        const today = new Date().toISOString().split('T')[0]
        const future = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
        q2 = q2.gte('expiry_date', today).lte('expiry_date', future)
      }
      return q2
    }

    const [countResult, dataResult] = await Promise.all([
      buildBaseQuery().limit(1),
      buildBaseQuery()
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + pageSize - 1),
    ])

    if (countResult.error) throw countResult.error
    if (dataResult.error) throw dataResult.error

    const total = countResult.count ?? 0
    const patents = (dataResult.data ?? []) as Patent[]

    // days_to_expiry 계산
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const enriched = patents.map((p) => ({
      ...p,
      days_to_expiry: p.expiry_date
        ? Math.ceil(
            (new Date(p.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null,
    }))

    const response: PaginatedResponse<Patent> = {
      data: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }

    return successResponse(response)
  } catch (err) {
    console.error('[GET /api/patents]', err)
    return internalErrorResponse()
  }
}
