import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyCronSecret } from '@/lib/helpers'
import { notificationService } from '@/lib/notifications'
import type { AlertRule, Patent, AlertType } from '@/lib/types'

const WINDOW_MINUTES = 15

interface ProcessResult {
  processed: number
  sent: number
  skipped: number
  failed: number
}

async function getRecentPatents(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<Patent[]> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('patents')
    .select('*')
    .gte('created_at', since)
  return (data ?? []) as Patent[]
}

async function hasAlreadySent(
  supabase: ReturnType<typeof createServiceClient>,
  alertRuleId: string,
  patentId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('alert_logs')
    .select('id')
    .eq('alert_rule_id', alertRuleId)
    .eq('patent_id', patentId)
    .maybeSingle()
  return Boolean(data)
}

async function sendAndLog(
  supabase: ReturnType<typeof createServiceClient>,
  rule: AlertRule,
  patent: Patent,
  userEmail: string,
  daysToExpiry?: number,
): Promise<boolean> {
  // 중복 발송 확인
  if (await hasAlreadySent(supabase, rule.id, patent.id)) {
    return false // skipped
  }

  const result = await notificationService.send(rule.channel, {
    to: userEmail,
    subject: '',
    type: rule.type,
    patent,
    ruleName: rule.name,
    daysToExpiry,
  })

  await supabase.from('alert_logs').insert({
    alert_rule_id: rule.id,
    patent_id: patent.id,
    status: result.success ? 'SENT' : 'FAIL',
    error_message: result.error ?? null,
  })

  return result.success
}

async function getUserEmail(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase.auth.admin.getUserById(userId)
  return data.user?.email ?? null
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const result: ProcessResult = { processed: 0, sent: 0, skipped: 0, failed: 0 }

  try {
    // 활성화된 알림 규칙 전체 조회
    const { data: rules } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('is_enabled', true)
    if (!rules?.length) {
      return NextResponse.json({ ...result, message: 'No active alert rules' })
    }

    // 최근 신규 특허 조회
    const recentPatents = await getRecentPatents(supabase)

    const today = new Date().toISOString().split('T')[0]

    for (const rule of rules as AlertRule[]) {
      result.processed++
      const userEmail = await getUserEmail(supabase, rule.user_id)
      if (!userEmail) continue

      const ruleJson = rule.rule_json

      // type에 따른 매칭 로직
      let matchedPatents: { patent: Patent; daysToExpiry?: number }[] = []

      if (rule.type === ('KEYWORD' as AlertType) && ruleJson.keyword) {
        const keyword = ruleJson.keyword.toLowerCase()
        matchedPatents = recentPatents
          .filter(
            (p) =>
              p.title.toLowerCase().includes(keyword) ||
              (p.abstract ?? '').toLowerCase().includes(keyword),
          )
          .map((patent) => ({ patent }))
      } else if (rule.type === ('COMPETITOR' as AlertType) && ruleJson.applicantName) {
        const name = ruleJson.applicantName.toLowerCase()
        matchedPatents = recentPatents
          .filter((p) => (p.applicant_name ?? '').toLowerCase().includes(name))
          .map((patent) => ({ patent }))
      } else if (rule.type === ('IPC' as AlertType) && ruleJson.ipcCodes?.length) {
        const ruleCodes = new Set(ruleJson.ipcCodes)
        matchedPatents = recentPatents
          .filter((p) => p.ipc_codes.some((c) => ruleCodes.has(c)))
          .map((patent) => ({ patent }))
      } else if (rule.type === ('EXPIRY' as AlertType) && ruleJson.daysBeforeExpiry?.length) {
        // EXPIRY: 각 daysBeforeExpiry에 대해 정확히 해당 일 후 만료되는 특허 조회
        for (const days of ruleJson.daysBeforeExpiry) {
          const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
          const { data: expiringPatents } = await supabase
            .from('patents')
            .select('*')
            .eq('expiry_date', targetDate)
            .eq('status', 'REGISTERED')
          if (expiringPatents) {
            for (const p of expiringPatents as Patent[]) {
              matchedPatents.push({ patent: p, daysToExpiry: days })
            }
          }
        }
      }

      // 매칭된 특허에 대해 알림 발송
      for (const { patent, daysToExpiry } of matchedPatents) {
        const sent = await sendAndLog(supabase, rule, patent, userEmail, daysToExpiry)
        if (sent) {
          result.sent++
        } else {
          result.skipped++
        }
      }
    }

    console.log(
      `[process-alerts] processed=${result.processed} sent=${result.sent} skipped=${result.skipped} failed=${result.failed}`,
    )

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[process-alerts]', err)
    return NextResponse.json({ ...result, error: msg }, { status: 500 })
  }
}
