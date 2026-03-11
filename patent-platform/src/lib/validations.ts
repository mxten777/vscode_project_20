import { z } from 'zod'
import type { PatentStatus, PatentSource, AlertType, AlertChannel } from './types'

// ============================================================
// 공통 enum 스키마
// ============================================================

const patentStatusEnum = z.enum([
  'PENDING',
  'REGISTERED',
  'EXPIRED',
  'REJECTED',
  'WITHDRAWN',
] as [PatentStatus, ...PatentStatus[]])

const patentSourceEnum = z.enum(['KIPRIS', 'USPTO'] as [PatentSource, ...PatentSource[]])

const alertTypeEnum = z.enum([
  'COMPETITOR',
  'IPC',
  'EXPIRY',
  'KEYWORD',
] as [AlertType, ...AlertType[]])

const alertChannelEnum = z.enum(['EMAIL', 'KAKAO'] as [AlertChannel, ...AlertChannel[]])

// ============================================================
// 특허 검색 쿼리 스키마
// ============================================================
export const patentSearchSchema = z.object({
  q: z.string().optional(),
  status: patentStatusEnum.optional(),
  source: patentSourceEnum.optional(),
  ipcCode: z.string().optional(),
  applicantName: z.string().optional(),
  inventorName: z.string().optional(),
  filingDateFrom: z.string().optional(),
  filingDateTo: z.string().optional(),
  expiryDays: z.coerce.number().int().positive().optional(),
  sortBy: z
    .enum(['filing_date', 'expiry_date', 'registration_date', 'created_at'])
    .optional()
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type PatentSearchParams = z.infer<typeof patentSearchSchema>

// ============================================================
// 알림 규칙 JSON 스키마
// ============================================================
export const alertRuleJsonSchema = z.object({
  keyword: z.string().optional(),
  applicantName: z.string().optional(),
  ipcCodes: z.array(z.string()).optional(),
  daysBeforeExpiry: z.array(z.number().int().positive()).optional(),
})

// ============================================================
// 알림 규칙 생성 스키마
// ============================================================
export const alertRuleCreateSchema = z.object({
  name: z.string().min(1, '알림 규칙 이름을 입력해 주세요.'),
  type: alertTypeEnum,
  rule_json: alertRuleJsonSchema.default({}),
  channel: alertChannelEnum.default('EMAIL'),
  is_enabled: z.boolean().default(true),
})

export type AlertRuleCreateInput = z.infer<typeof alertRuleCreateSchema>

// ============================================================
// 알림 규칙 수정 스키마 (모두 optional)
// ============================================================
export const alertRuleUpdateSchema = alertRuleCreateSchema.partial()

export type AlertRuleUpdateInput = z.infer<typeof alertRuleUpdateSchema>

// ============================================================
// 리포트 쿼리 스키마
// ============================================================
export const reportQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
})

export type ReportQueryParams = z.infer<typeof reportQuerySchema>

// ============================================================
// 인증 스키마
// ============================================================
export const signUpSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해 주세요.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .max(72, '비밀번호는 72자 이하여야 합니다.'),
  org_name: z.string().min(1, '조직명을 입력해 주세요.').max(100).optional(),
})

export type SignUpInput = z.infer<typeof signUpSchema>

export const signInSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
})

export type SignInInput = z.infer<typeof signInSchema>

// ============================================================
// 주시 목록 메모 수정 스키마
// ============================================================
export const watchlistNoteSchema = z.object({
  note: z.string().max(500, '메모는 500자 이하여야 합니다.').nullable().optional(),
})

export type WatchlistNoteInput = z.infer<typeof watchlistNoteSchema>
