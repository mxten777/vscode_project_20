'use client'

import * as React from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, HeartOff, CalendarDays, User, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { usePatent, useToggleWatch } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { formatDaysToExpiry } from '@/lib/client-helpers'
import type { PatentStatus } from '@/lib/types'

const STATUS_LABELS: Record<PatentStatus, string> = {
  PENDING: '출원중',
  REGISTERED: '등록',
  EXPIRED: '만료',
  REJECTED: '거절',
  WITHDRAWN: '취하',
}

const STATUS_VARIANTS: Record<PatentStatus, 'default' | 'success' | 'destructive' | 'warning' | 'secondary' | 'outline' | 'info'> = {
  PENDING: 'secondary',
  REGISTERED: 'success',
  EXPIRED: 'destructive',
  REJECTED: 'outline',
  WITHDRAWN: 'outline',
}

export default function PatentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: patent, isLoading, error } = usePatent(id)
  const { mutate: toggleWatch, isPending: toggling } = useToggleWatch(id)

  const handleToggleWatch = () => {
    if (!patent) return
    toggleWatch(
      { isWatched: patent.is_watched ?? false },
      {
        onSuccess: () =>
          toast.success(patent.is_watched ? '주시 해제되었습니다.' : '주시 목록에 추가했습니다.'),
        onError: () => toast.error('처리 중 오류가 발생했습니다.'),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !patent) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">특허를 찾을 수 없습니다.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">목록으로 돌아가기</Link>
        </Button>
      </div>
    )
  }

  const daysLabel = formatDaysToExpiry(patent.expiry_date)
  const statusVariant = STATUS_VARIANTS[patent.status] ?? 'outline'
  const statusLabel = STATUS_LABELS[patent.status] ?? patent.status

  return (
    <div className="max-w-4xl space-y-6">
      {/* 뒤로가기 */}
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-1" />
          목록
        </Link>
      </Button>

      {/* 헤더 */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold leading-tight">{patent.title}</h1>
          <Button
            variant={patent.is_watched ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleWatch}
            disabled={toggling}
            className="shrink-0"
          >
            {patent.is_watched ? (
              <>
                <Heart className="h-4 w-4 mr-1.5 fill-current" />
                주시 중
              </>
            ) : (
              <>
                <HeartOff className="h-4 w-4 mr-1.5" />
                주시하기
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          <Badge variant="outline">{patent.source}</Badge>
          {patent.title_en && (
            <span className="text-sm text-muted-foreground">{patent.title_en}</span>
          )}
        </div>
        {patent.days_to_expiry !== null && patent.days_to_expiry !== undefined && (
          <p
            className={`text-sm font-semibold ${
              patent.days_to_expiry <= 30 && patent.days_to_expiry >= 0
                ? 'text-destructive'
                : 'text-muted-foreground'
            }`}
          >
            {daysLabel !== '-' && daysLabel !== '만료됨'
              ? `만료까지 ${daysLabel}`
              : daysLabel === '만료됨'
              ? '이미 만료된 특허입니다'
              : ''}
          </p>
        )}
      </div>

      <Separator />

      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="출원번호" value={patent.source_patent_id} mono />
            <InfoRow label="출원일" value={patent.filing_date} />
            <InfoRow label="공개일" value={patent.publication_date} />
            <InfoRow label="등록일" value={patent.registration_date} />
            <InfoRow
              label="만료일"
              value={patent.expiry_date}
              highlight={
                patent.days_to_expiry !== null &&
                patent.days_to_expiry !== undefined &&
                patent.days_to_expiry <= 30 &&
                patent.days_to_expiry >= 0
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              출원인 / 발명자
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">출원인</p>
              <p className="text-sm font-medium">{patent.applicant_name ?? '-'}</p>
              {patent.applicant?.name_en && (
                <p className="text-xs text-muted-foreground">{patent.applicant.name_en}</p>
              )}
            </div>
            {patent.inventor_names.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">발명자</p>
                <div className="flex flex-wrap gap-1">
                  {patent.inventor_names.map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* IPC 분류 */}
      {patent.ipc_codes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              IPC 분류 코드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {patent.ipc_codes.map((code, i) => (
                <div key={code} className="flex items-center gap-1.5">
                  <Badge variant="outline" className="font-mono">
                    {code}
                  </Badge>
                  {patent.ipc_names[i] && (
                    <span className="text-xs text-muted-foreground">{patent.ipc_names[i]}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 초록 */}
      {patent.abstract && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">초록 (Abstract)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {patent.abstract}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={[
          mono ? 'font-mono text-xs' : 'font-medium',
          highlight ? 'text-destructive font-bold' : '',
        ].join(' ')}
      >
        {value ?? '-'}
      </span>
    </div>
  )
}
