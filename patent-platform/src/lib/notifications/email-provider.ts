import { Resend } from 'resend'
import type { NotificationProvider, NotificationPayload } from './types'
import { formatIpcCodes } from '@/lib/helpers'

function buildSubject(payload: NotificationPayload): string {
  const { type, patent, daysToExpiry } = payload
  switch (type) {
    case 'COMPETITOR':
      return `[특허알림] ${patent.applicant_name ?? '출원인'}의 신규 출원: ${patent.title}`
    case 'IPC':
      return `[특허알림] IPC ${formatIpcCodes(patent.ipc_codes)} 신규 특허: ${patent.title}`
    case 'EXPIRY':
      return `[특허알림] 만료 D-${daysToExpiry ?? '?'}: ${patent.title}`
    case 'KEYWORD':
      return `[특허알림] 키워드 매칭: ${patent.title}`
    default:
      return `[특허알림] ${patent.title}`
  }
}

function buildHtmlBody(payload: NotificationPayload): string {
  const { type, patent, ruleName, daysToExpiry } = payload
  const expiryInfo =
    type === 'EXPIRY' && daysToExpiry !== undefined
      ? `<p><strong>만료까지:</strong> D-${daysToExpiry}</p>`
      : ''

  const ipcInfo =
    patent.ipc_codes.length > 0
      ? `<p><strong>IPC 분류:</strong> ${formatIpcCodes(patent.ipc_codes)}</p>`
      : ''

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>특허 알림</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 20px;">🔔 특허 모니터링 알림</h1>
    <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">규칙: ${ruleName}</p>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <h2 style="font-size: 18px; color: #111827; margin-top: 0;">${patent.title}</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
      <tr>
        <td style="padding: 6px 0; font-weight: 600; width: 130px;">출원번호</td>
        <td style="padding: 6px 0;">${patent.source_patent_id}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: 600;">출원인</td>
        <td style="padding: 6px 0;">${patent.applicant_name ?? '-'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: 600;">출원일</td>
        <td style="padding: 6px 0;">${patent.filing_date ?? '-'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: 600;">상태</td>
        <td style="padding: 6px 0;">${patent.status}</td>
      </tr>
      ${
        patent.expiry_date
          ? `<tr>
        <td style="padding: 6px 0; font-weight: 600;">만료일</td>
        <td style="padding: 6px 0;">${patent.expiry_date}</td>
      </tr>`
          : ''
      }
    </table>
    ${expiryInfo}
    ${ipcInfo}
    ${
      patent.abstract
        ? `<div style="margin-top: 16px; background: #f9fafb; border-left: 3px solid #2563eb; padding: 12px; border-radius: 0 4px 4px 0; font-size: 13px; color: #4b5563;">
      <strong>초록</strong><br/>
      ${patent.abstract.slice(0, 300)}${patent.abstract.length > 300 ? '...' : ''}
    </div>`
        : ''
    }
    <div style="margin-top: 24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/patents/${patent.id}"
         style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
        특허 상세 보기 →
      </a>
    </div>
  </div>
  <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
    Patent Platform · 알림 수신을 원하지 않으시면 알림 규칙을 비활성화하세요.
  </p>
</body>
</html>`
}

export class EmailProvider implements NotificationProvider {
  private resend: Resend

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = buildSubject(payload)
      const html = buildHtmlBody(payload)

      const { error } = await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@patent-platform.com',
        to: [payload.to],
        subject,
        html,
      })

      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      return { success: false, error: message }
    }
  }
}
