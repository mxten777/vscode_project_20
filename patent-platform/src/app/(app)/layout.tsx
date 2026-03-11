import * as React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header, BottomNav } from '@/components/header'
import { MOCK_USER } from '@/lib/mock-data'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // 목업 모드: 가짜 사용자로 통과
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    return (
      <div className="min-h-screen bg-background">
        <Header userEmail={MOCK_USER.email} />
        <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
        <BottomNav />
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userEmail={user.email} />
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
      <BottomNav />
    </div>
  )
}
