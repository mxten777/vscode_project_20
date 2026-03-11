import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reportQuerySchema } from '@/lib/validations'
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/api-response'
import type { ReportSummary, Patent, PatentStatus } from '@/lib/types'
import { subMonths, format, startOfMonth } from 'date-fns'
import { MOCK_REPORT } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  try {
    // 목업 모드
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      return successResponse(MOCK_REPORT)
    }

    const { searchParams } = request.nextUrl
    const parsed = reportQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors)
    }

    const { from, to } = parsed.data
    const toDate = to ? new Date(to) : new Date()
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - 365 * 24 * 60 * 60 * 1000)

    const fromStr = fromDate.toISOString().split('T')[0]
    const toStr = toDate.toISOString().split('T')[0]

    const supabase = await createClient()

    // 병렬 쿼리 실행
    const [totalResult, statusResult, applicantResult, ipcResult, monthlyResult, expiringResult] =
      await Promise.all([
        // 총 특허 수
        supabase
          .from('patents')
          .select('*', { count: 'exact', head: true })
          .gte('filing_date', fromStr)
          .lte('filing_date', toStr),

        // 상태별 분포
        supabase
          .from('patents')
          .select('status')
          .gte('filing_date', fromStr)
          .lte('filing_date', toStr),

        // 출원인 TOP 10
        supabase
          .from('patents')
          .select('applicant_name')
          .gte('filing_date', fromStr)
          .lte('filing_date', toStr)
          .not('applicant_name', 'is', null),

        // IPC TOP 10
        supabase
          .from('patents')
          .select('ipc_codes')
          .gte('filing_date', fromStr)
          .lte('filing_date', toStr),

        // 월별 출원 추이 (최근 12개월)
        supabase
          .from('patents')
          .select('filing_date')
          .gte('filing_date', format(subMonths(toDate, 12), 'yyyy-MM-dd'))
          .lte('filing_date', toStr)
          .not('filing_date', 'is', null),

        // 30일 이내 만료 특허
        supabase
          .from('patents')
          .select('*')
          .gte('expiry_date', new Date().toISOString().split('T')[0])
          .lte(
            'expiry_date',
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          )
          .eq('status', 'REGISTERED')
          .order('expiry_date')
          .limit(20),
      ])

    // 상태별 집계
    const statusMap: Record<string, number> = {}
    if (statusResult.data) {
      for (const row of statusResult.data) {
        const s = row.status as string
        statusMap[s] = (statusMap[s] ?? 0) + 1
      }
    }
    const by_status = Object.entries(statusMap).map(([status, count]) => ({
      status: status as PatentStatus,
      count,
    }))

    // 출원인 TOP 10
    const applicantMap: Record<string, number> = {}
    if (applicantResult.data) {
      for (const row of applicantResult.data) {
        const name = row.applicant_name as string
        if (name) applicantMap[name] = (applicantMap[name] ?? 0) + 1
      }
    }
    const top_applicants = Object.entries(applicantMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([applicant_name, count]) => ({ applicant_name, count }))

    // IPC TOP 10
    const ipcMap: Record<string, number> = {}
    if (ipcResult.data) {
      for (const row of ipcResult.data) {
        const codes = row.ipc_codes as string[]
        if (Array.isArray(codes)) {
          for (const code of codes) {
            ipcMap[code] = (ipcMap[code] ?? 0) + 1
          }
        }
      }
    }
    const top_ipc = Object.entries(ipcMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ipc_code, count]) => ({ ipc_code, count }))

    // 월별 출원 추이
    const monthMap: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const m = format(startOfMonth(subMonths(toDate, i)), 'yyyy-MM')
      monthMap[m] = 0
    }
    if (monthlyResult.data) {
      for (const row of monthlyResult.data) {
        if (row.filing_date) {
          const m = (row.filing_date as string).slice(0, 7)
          if (m in monthMap) monthMap[m] = (monthMap[m] ?? 0) + 1
        }
      }
    }
    const monthly_filings = Object.entries(monthMap).map(([month, count]) => ({
      month,
      count,
    }))

    const summary: ReportSummary = {
      period: { from: fromStr, to: toStr },
      total_patents: totalResult.count ?? 0,
      by_status,
      top_applicants,
      top_ipc,
      monthly_filings,
      expiring_soon: (expiringResult.data ?? []) as Patent[],
    }

    return successResponse(summary)
  } catch (err) {
    console.error('[GET /api/reports/summary]', err)
    return internalErrorResponse()
  }
}
