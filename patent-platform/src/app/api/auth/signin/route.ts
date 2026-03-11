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
