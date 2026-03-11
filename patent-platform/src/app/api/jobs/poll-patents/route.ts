import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyCronSecret } from '@/lib/helpers'
import { retryWithBackoff, normalizeDate, calcExpiryDate } from '@/lib/helpers'
import type { KiprisApiResponse, KiprisPatentItem } from '@/lib/types'

const KIPRIS_BASE_URL =
  process.env.KIPRIS_API_BASE_URL ?? 'https://plus.kipris.or.kr/openapi/rest'
const PAGE_SIZE = 100

interface PollResult {
  inserted: number
  updated: number
  errors: string[]
}

async function fetchKiprisPage(
  apiKey: string,
  startDate: string,
  endDate: string,
  pageNo: number,
): Promise<KiprisApiResponse> {
  const url = new URL(`${KIPRIS_BASE_URL}/patUtiModInfoSearchSevice/patentUtilityInfo`)
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('applicationStartDate', startDate)
  url.searchParams.set('applicationEndDate', endDate)
  url.searchParams.set('pageNo', String(pageNo))
  url.searchParams.set('numOfRows', String(PAGE_SIZE))
  url.searchParams.set('type', 'json')

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    // Vercel 배포 시 ICN1 리전 우선 사용
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`KIPRIS API HTTP ${response.status}`)
  }

  return response.json() as Promise<KiprisApiResponse>
}

function normalizeItems(
  items: KiprisPatentItem | KiprisPatentItem[],
): KiprisPatentItem[] {
  return Array.isArray(items) ? items : [items]
}

async function upsertPatents(
  supabase: ReturnType<typeof createServiceClient>,
  items: KiprisPatentItem[],
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  let inserted = 0
  let updated = 0
  const errors: string[] = []

  for (const item of items) {
    try {
      const applicationNumber = item.applicationNumber?.trim()
      if (!applicationNumber) continue

      const inventorNames = item.inventorName
        ? item.inventorName
            .split(/[,，;；]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : []

      const ipcCodes = item.ipcNumber
        ? item.ipcNumber
            .split(/[,，;；\s]+/)
            .map((s) => s.trim().slice(0, 4))
            .filter(Boolean)
        : []

      const filingDate = normalizeDate(item.applicationDate)
      const publicationDate = normalizeDate(item.openDate || item.publicationDate)
      const registrationDate = normalizeDate(item.registrationDate)
      const expiryDate = calcExpiryDate(registrationDate)

      const status = registrationDate
        ? expiryDate && new Date(expiryDate) < new Date()
          ? 'EXPIRED'
          : 'REGISTERED'
        : 'PENDING'

      // 출원인 upsert
      let applicantId: string | null = null
      if (item.applicantName?.trim()) {
        const applicantName = item.applicantName.trim()
        const { data: applicant } = await supabase
          .from('applicants')
          .upsert(
            { name: applicantName, country: 'KR' },
            { onConflict: 'name,country', ignoreDuplicates: false },
          )
          .select('id')
          .single()
        applicantId = applicant?.id ?? null
      }

      const patentData = {
        source_patent_id: applicationNumber,
        title: item.inventionTitle?.trim() || applicationNumber,
        applicant_id: applicantId,
        applicant_name: item.applicantName?.trim() || null,
        inventor_names: inventorNames,
        ipc_codes: ipcCodes,
        ipc_names: [],
        filing_date: filingDate,
        publication_date: publicationDate,
        registration_date: registrationDate,
        expiry_date: expiryDate,
        status,
        source: 'KIPRIS' as const,
        raw_json: item as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }

      const { data: existing } = await supabase
        .from('patents')
        .select('id')
        .eq('source_patent_id', applicationNumber)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('patents')
          .update(patentData)
          .eq('source_patent_id', applicationNumber)
        updated++
      } else {
        await supabase.from('patents').insert(patentData)
        inserted++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${item.applicationNumber}: ${msg}`)
    }
  }

  return { inserted, updated, errors }
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.KIPRIS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'KIPRIS_API_KEY not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()
  const result: PollResult = { inserted: 0, updated: 0, errors: [] }

  try {
    // 전날 수집 대상 날짜 계산
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '')

    // 첫 페이지 조회
    const firstPage = await retryWithBackoff(() =>
      fetchKiprisPage(apiKey, dateStr, dateStr, 1),
    )

    const body = firstPage.response?.body
    if (!body) {
      return NextResponse.json({ ...result, message: 'No data returned from KIPRIS' })
    }

    const totalCount = body.totalCount ?? 0
    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    if (totalPages === 0 || !body.items?.item) {
      return NextResponse.json({ ...result, message: 'No patents for date range' })
    }

    // 첫 페이지 처리
    const firstItems = normalizeItems(body.items.item)
    const firstResult = await upsertPatents(supabase, firstItems)
    result.inserted += firstResult.inserted
    result.updated += firstResult.updated
    result.errors.push(...firstResult.errors)

    // 추가 페이지 처리
    for (let page = 2; page <= Math.min(totalPages, 10); page++) {
      const pageData = await retryWithBackoff(() =>
        fetchKiprisPage(apiKey, dateStr, dateStr, page),
      )
      const pageItems = pageData.response?.body?.items?.item
      if (!pageItems) continue
      const pageResult = await upsertPatents(supabase, normalizeItems(pageItems))
      result.inserted += pageResult.inserted
      result.updated += pageResult.updated
      result.errors.push(...pageResult.errors)
    }

    console.log(`[poll-patents] inserted=${result.inserted} updated=${result.updated} errors=${result.errors.length}`)

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[poll-patents]', err)
    return NextResponse.json({ ...result, error: msg }, { status: 500 })
  }
}
