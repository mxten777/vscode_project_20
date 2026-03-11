import type { NotificationProvider, NotificationPayload } from './types'

/**
 * 카카오 알림톡 Mock 구현
 * 실제 카카오 비즈니스 API 키 발급 후 교체 필요
 */
export class KakaoProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    // Mock: 실제 환경에서는 카카오 비즈니스 메시지 API 호출
    console.log('[KakaoProvider] Mock 알림 발송:', {
      to: payload.to,
      type: payload.type,
      patent: payload.patent.source_patent_id,
      ruleName: payload.ruleName,
    })

    // 개발 환경에서는 항상 성공 반환
    if (process.env.NODE_ENV === 'development') {
      return { success: true }
    }

    // 프로덕션에서 실제 카카오 API 통합 시 아래 코드를 활성화
    // const response = await fetch('https://kapi.kakao.com/v1/api/talk/friends/message/send', {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer ${process.env.KAKAO_ACCESS_TOKEN}`,
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: new URLSearchParams({
    //     receiver_uuids: JSON.stringify([payload.to]),
    //     template_object: JSON.stringify({
    //       object_type: 'text',
    //       text: `[특허알림] ${payload.patent.title}\n규칙: ${payload.ruleName}`,
    //       link: { web_url: `${process.env.NEXT_PUBLIC_APP_URL}/patents/${payload.patent.id}` },
    //     }),
    //   }),
    // })
    // if (!response.ok) {
    //   const err = await response.json()
    //   return { success: false, error: err.msg }
    // }
    // return { success: true }

    return { success: false, error: 'Kakao provider not configured in production' }
  }
}
