import type { AlertChannel } from '@/lib/types'
import type { NotificationProvider, NotificationPayload } from './types'
import { EmailProvider } from './email-provider'
import { KakaoProvider } from './kakao-provider'

export type { NotificationProvider, NotificationPayload }

class NotificationService {
  private providers: Record<AlertChannel, NotificationProvider>

  constructor() {
    this.providers = {
      EMAIL: new EmailProvider(),
      KAKAO: new KakaoProvider(),
    }
  }

  async send(
    channel: AlertChannel,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; error?: string }> {
    const provider = this.providers[channel]
    if (!provider) {
      return { success: false, error: `지원하지 않는 채널: ${channel}` }
    }
    return provider.send(payload)
  }
}

export const notificationService = new NotificationService()
