import { differenceInDays, parseISO } from 'date-fns'
import { NextRequest } from 'next/server'
import { unauthorizedResponse } from './api-response'

// ============================================================
// Cron 인증 검증
// ============================================================
export function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  const token = authHeader.slice(7)
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || token.length < 32) {
    return false
  }
  // 타이밍 공격 방지를 위한 상수 시간 비교
  if (token.length !== cronSecret.length) {
    return false
  }
  let mismatch = 0
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ cronSecret.charCodeAt(i)
  }
  return mismatch === 0
}

export function cronUnauthorizedResponse() {
  return unauthorizedResponse()
}

// ============================================================
// 지수 백오프 재시도
// ============================================================
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        const jitter = Math.random() * delay * 0.1
        await new Promise((resolve) => setTimeout(resolve, delay + jitter))
      }
    }
  }
  throw lastError
}

// ============================================================
// 만료일 D-day 포맷
// ============================================================
export function formatDaysToExpiry(expiryDate: string | null): string {
  if (!expiryDate) return '-'
  try {
    const expiry = parseISO(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = differenceInDays(expiry, today)
    if (diff < 0) return '만료됨'
    if (diff === 0) return 'D-day'
    return `D-${diff}`
  } catch {
    return '-'
  }
}

// ============================================================
// IPC 코드 포맷
// ============================================================
export function formatIpcCodes(codes: string[]): string {
  if (!codes || codes.length === 0) return '-'
  return codes.join(' • ')
}

// ============================================================
// 만료일 계산 (등록일 + 20년)
// ============================================================
export function calcExpiryDate(registrationDate: string | null): string | null {
  if (!registrationDate) return null
  try {
    const regDate = parseISO(registrationDate)
    const expiry = new Date(regDate)
    expiry.setFullYear(expiry.getFullYear() + 20)
    return expiry.toISOString().split('T')[0]
  } catch {
    return null
  }
}

// ============================================================
// 날짜 문자열 정규화 (YYYYMMDD → YYYY-MM-DD)
// ============================================================
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null
  const cleaned = dateStr.trim()
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
  }
  return cleaned
}

// ============================================================
// D-day 숫자 계산
// ============================================================
export function calcDaysToExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  try {
    const expiry = parseISO(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return differenceInDays(expiry, today)
  } catch {
    return null
  }
}
