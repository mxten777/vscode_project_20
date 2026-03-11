import { createClient } from '@/lib/supabase/server'
import { successResponse, internalErrorResponse } from '@/lib/api-response'

export async function POST() {
  try {
    // 목업 모드
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      return successResponse({ message: '로그아웃되었습니다.' })
    }
    const supabase = await createClient()
    await supabase.auth.signOut()
    return successResponse({ message: '로그아웃되었습니다.' })
  } catch {
    return internalErrorResponse()
  }
}
