import { createClient } from '@/lib/supabase/server'
import { unauthorizedResponse } from '@/lib/api-response'
import type { NextResponse } from 'next/server'
import type { ApiError } from '@/lib/api-response'
import type { OrgRole } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { MOCK_USER, MOCK_ORG_ID } from '@/lib/mock-data'

export interface AuthContext {
  user: User
  orgId: string | null
  role: OrgRole | null
  supabase: SupabaseClient
}

export interface AuthContextError {
  error: NextResponse<ApiError>
}

/**
 * Route Handler에서 인증 컨텍스트를 가져옵니다.
 * 인증 실패 시 { error: unauthorizedResponse() } 를 반환합니다.
 */
export async function getAuthContext(): Promise<AuthContext | AuthContextError> {
  // 목업 모드: 가짜 인증 컨텍스트 반환
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    return {
      user: MOCK_USER as unknown as User,
      orgId: MOCK_ORG_ID,
      role: 'admin',
      supabase: null as unknown as SupabaseClient,
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: unauthorizedResponse() }
  }

  // org_members에서 소속 org 조회 (첫 번째 org 사용)
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .order('org_id')
    .limit(1)
    .maybeSingle()

  return {
    user,
    orgId: member?.org_id ?? null,
    role: (member?.role as OrgRole) ?? null,
    supabase,
  }
}

export function isAuthError(ctx: AuthContext | AuthContextError): ctx is AuthContextError {
  return 'error' in ctx
}
