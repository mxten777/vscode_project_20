// ============================================================
// 공통 타입 정의
// ============================================================

export type PatentStatus = 'PENDING' | 'REGISTERED' | 'EXPIRED' | 'REJECTED' | 'WITHDRAWN'
export type PatentSource = 'KIPRIS' | 'USPTO'
export type AlertType = 'COMPETITOR' | 'IPC' | 'EXPIRY' | 'KEYWORD'
export type AlertChannel = 'EMAIL' | 'KAKAO'
export type OrgRole = 'admin' | 'member'
export type OrgPlan = 'free' | 'pro' | 'enterprise'

export interface Applicant {
  id: string
  name: string
  name_en: string | null
  country: string
  type: 'corporation' | 'individual'
  raw_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Patent {
  id: string
  source_patent_id: string
  title: string
  title_en: string | null
  abstract: string | null
  applicant_id: string | null
  applicant_name: string | null
  inventor_names: string[]
  ipc_codes: string[]
  ipc_names: string[]
  filing_date: string | null
  publication_date: string | null
  registration_date: string | null
  expiry_date: string | null
  status: PatentStatus
  source: PatentSource
  raw_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // 조인 필드
  applicant?: Applicant
  is_watched?: boolean
  days_to_expiry?: number | null
}

export interface WatchlistItem {
  id: string
  org_id: string
  user_id: string
  patent_id: string
  note: string | null
  created_at: string
  patent?: Patent
}

export interface AlertRuleJson {
  keyword?: string
  applicantName?: string
  ipcCodes?: string[]
  daysBeforeExpiry?: number[]
}

export interface AlertRule {
  id: string
  org_id: string
  user_id: string
  name: string
  type: AlertType
  rule_json: AlertRuleJson
  channel: AlertChannel
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface AlertLog {
  id: string
  alert_rule_id: string
  patent_id: string
  sent_at: string
  status: 'SENT' | 'FAIL'
  error_message: string | null
  patent?: Patent
  alert_rule?: AlertRule
}

export interface Org {
  id: string
  name: string
  plan: OrgPlan
  created_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ReportSummary {
  period: { from: string; to: string }
  total_patents: number
  by_status: { status: PatentStatus; count: number }[]
  top_applicants: { applicant_name: string; count: number }[]
  top_ipc: { ipc_code: string; count: number }[]
  monthly_filings: { month: string; count: number }[]
  expiring_soon: Patent[]
}

// KIPRIS API 응답 타입
export interface KiprisPatentItem {
  applicationNumber: string
  inventionTitle: string
  applicantName: string
  inventorName: string
  ipcNumber: string
  applicationDate: string
  publicationDate: string
  registrationDate: string
  registrationNumber: string
  openNumber: string
  openDate: string
  internationalOpenNumber: string
  priorityApplicationNumber: string
  priorityApplicationCountry: string
  priorityApplicationDate: string
}

export interface KiprisApiResponse {
  response: {
    header: {
      resultCode: string
      resultMsg: string
    }
    body: {
      items?: {
        item: KiprisPatentItem | KiprisPatentItem[]
      }
      totalCount: number
      pageNo: number
      numOfRows: number
    }
  }
}
