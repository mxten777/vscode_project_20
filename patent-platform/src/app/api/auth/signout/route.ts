import { createClient } from '@/lib/supabase/server'
import { successResponse, internalErrorResponse } from '@/lib/api-response'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return successResponse({ message: '로그아웃되었습니다.' })
  } catch {
    return internalErrorResponse()
  }
}
