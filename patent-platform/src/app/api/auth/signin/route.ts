import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signInSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const parsed = signInSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors)
    }
    const { email, password } = parsed.data

    // 목업 모드: 데모 계정으로 즉시 통과
    if (process.env.NEXT_PUBLIC_MOCK === 'true') {
      if (email === 'demo@patent-platform.dev' && password === 'demo1234') {
        return successResponse({ user: { id: 'mock-user-001', email } })
      }
      return errorResponse('SIGNIN_ERROR', '이메일 또는 비밀번호가 올바르지 않습니다.', 401)
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return errorResponse('SIGNIN_ERROR', '이메일 또는 비밀번호가 올바르지 않습니다.', 401)
    }

    return successResponse({ user: data.user })
  } catch {
    return internalErrorResponse()
  }
}
