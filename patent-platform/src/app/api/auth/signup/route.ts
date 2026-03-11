import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signUpSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const parsed = signUpSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors)
    }
    const { email, password, org_name } = parsed.data

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
    })

    if (error) {
      return errorResponse('SIGNUP_ERROR', '회원가입에 실패했습니다.', 400)
    }

    // 기본 org 자동 생성
    if (data.user) {
      const { data: org } = await supabase
        .from('orgs')
        .insert({ name: org_name ?? email.split('@')[0] + '의 조직', plan: 'free' })
        .select()
        .single()

      if (org) {
        await supabase.from('org_members').insert({
          org_id: org.id,
          user_id: data.user.id,
          role: 'admin',
        })
      }
    }

    return successResponse({ user: data.user }, 201)
  } catch {
    return internalErrorResponse()
  }
}
