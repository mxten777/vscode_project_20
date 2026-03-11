import { differenceInDays, parseISO } from 'date-fns'

// ============================================================
// 만료일 D-day 포맷 (client-safe)
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
// IPC 코드 포맷 (client-safe)
// ============================================================
export function formatIpcCodes(codes: string[]): string {
  if (!codes || codes.length === 0) return '-'
  return codes.join(' • ')
}
