import type { AlertType } from '@/lib/types'
import type { Patent } from '@/lib/types'

export interface NotificationPayload {
  to: string
  subject: string
  type: AlertType
  patent: Patent
  ruleName: string
  daysToExpiry?: number
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }>
}
