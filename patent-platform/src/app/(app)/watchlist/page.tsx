'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Heart, StickyNote, ExternalLink, Trash2 } from 'lucide-react'
import { useWatchlist, useToggleWatch, useUpdateWatchlistNote } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import type { WatchlistItem, PatentStatus } from '@/lib/types'

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

const STATUS_BORDER: Record<PatentStatus, string> = {
  PENDING: 'border-l-4 border-l-blue-400',
  REGISTERED: 'border-l-4 border-l-emerald-500',
  EXPIRED: 'border-l-4 border-l-rose-500',
  REJECTED: 'border-l-4 border-l-slate-300',
  WITHDRAWN: 'border-l-4 border-l-slate-300',
}

export default function WatchlistPage() {
  const { data: items = [], isLoading } = useWatchlist()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">주시 목록</h1>
        <p className="text-sm text-muted-foreground mt-1">
          관심 특허를 추적하고 메모를 남겨두세요.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border rounded-xl">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">아직 주시한 특허가 없습니다.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/">특허 검색하러 가기</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <WatchlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function WatchlistCard({ item }: { item: WatchlistItem }) {
  const patent = item.patent
  const [editing, setEditing] = useState(false)
  const [noteValue, setNoteValue] = useState(item.note ?? '')
  const { mutate: toggleWatch, isPending: toggling } = useToggleWatch(item.patent_id)
  const { mutate: updateNote, isPending: saving } = useUpdateWatchlistNote(item.id)

  const handleUnwatch = () => {
    toggleWatch(
      { isWatched: true },
      {
        onSuccess: () => toast.success('주시가 해제되었습니다.'),
        onError: () => toast.error('처리 중 오류가 발생했습니다.'),
      },
    )
  }

  const handleSaveNote = () => {
    updateNote(
      { note: noteValue },
      {
        onSuccess: () => {
          toast.success('메모가 저장되었습니다.')
          setEditing(false)
        },
        onError: () => toast.error('저장 중 오류가 발생했습니다.'),
      },
    )
  }

  const handleCancelNote = () => {
    setNoteValue(item.note ?? '')
    setEditing(false)
  }

  if (!patent) return null

  const statusVariant = STATUS_VARIANTS[patent.status as PatentStatus] ?? 'outline'
  const statusLabel = STATUS_LABELS[patent.status as PatentStatus] ?? patent.status
  const borderClass = STATUS_BORDER[patent.status as PatentStatus] ?? ''

  return (
    <Card className={`flex flex-col overflow-hidden ${borderClass}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <Link
              href={`/patents/${patent.id}`}
              className="font-semibold text-sm leading-tight line-clamp-2 hover:underline"
            >
              {patent.title}
            </Link>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={statusVariant} className="text-xs">
                {statusLabel}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {patent.source}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {patent.source_patent_id}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button asChild variant="ghost" size="icon" className="h-7 w-7">
              <Link href={`/patents/${patent.id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive/80"
              onClick={handleUnwatch}
              disabled={toggling}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0 space-y-3">
        {patent.applicant_name && (
          <p className="text-xs text-muted-foreground">출원인: {patent.applicant_name}</p>
        )}

        {/* 메모 */}
        <div>
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="메모를 입력하세요..."
                className="text-sm min-h-18 resize-none"
                maxLength={500}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNote} disabled={saving}>
                  저장
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelNote}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="w-full text-left group"
              onClick={() => setEditing(true)}
            >
              <div className="flex items-start gap-1.5 min-h-9 rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                {noteValue ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">{noteValue}</p>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">
                    메모 추가...
                  </p>
                )}
              </div>
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-right">
          추가됨:{' '}
          {item.created_at
            ? new Date(item.created_at).toLocaleDateString('ko-KR')
            : '-'}
        </p>
      </CardContent>
    </Card>
  )
}
