'use client'
// Patent list and search page
import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Heart, HeartOff, Filter, SortAsc, SortDesc } from 'lucide-react'
import { toast } from 'sonner'
import { usePatents, useToggleWatch } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { formatDaysToExpiry } from '@/lib/client-helpers'
import type { Patent, PatentStatus } from '@/lib/types'
import Link from 'next/link'

const STATUS_BADGES: Record<PatentStatus, { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' | 'secondary' | 'outline' | 'info' }> = {
  PENDING: { label: '출원중', variant: 'secondary' },
  REGISTERED: { label: '등록', variant: 'success' },
  EXPIRED: { label: '만료', variant: 'destructive' },
  REJECTED: { label: '거절', variant: 'outline' },
  WITHDRAWN: { label: '취하', variant: 'outline' },
}

function WatchButton({ patent }: { patent: Patent }) {
  const { mutate, isPending } = useToggleWatch(patent.id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    mutate(
      { isWatched: patent.is_watched ?? false },
      {
        onSuccess: () => toast.success(patent.is_watched ? '주시 해제되었습니다.' : '주시 목록에 추가했습니다.'),
        onError: () => toast.error('처리 중 오류가 발생했습니다.'),
      },
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleClick}
      disabled={isPending}
      aria-label={patent.is_watched ? '주시 해제' : '주시 추가'}
    >
      {patent.is_watched ? (
        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
      ) : (
        <HeartOff className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  )
}

export default function PatentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [source, setSource] = useState(searchParams.get('source') ?? '')
  const [ipcCode, setIpcCode] = useState(searchParams.get('ipcCode') ?? '')
  const [expiryDays, setExpiryDays] = useState(searchParams.get('expiryDays') ?? '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'created_at')
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') ?? 'desc')
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'))

  // 300ms 디바운스
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // URL 동기화
  const updateUrl = useCallback(() => {
    const sp = new URLSearchParams()
    if (debouncedQuery) sp.set('q', debouncedQuery)
    if (status) sp.set('status', status)
    if (source) sp.set('source', source)
    if (ipcCode) sp.set('ipcCode', ipcCode)
    if (expiryDays) sp.set('expiryDays', expiryDays)
    if (sortBy !== 'created_at') sp.set('sortBy', sortBy)
    if (sortOrder !== 'desc') sp.set('sortOrder', sortOrder)
    if (page > 1) sp.set('page', String(page))
    router.replace(`/?${sp.toString()}`, { scroll: false })
  }, [debouncedQuery, status, source, ipcCode, expiryDays, sortBy, sortOrder, page, router])

  useEffect(() => {
    updateUrl()
  }, [updateUrl])

  const { data, isLoading } = usePatents({
    q: debouncedQuery || undefined,
    status: (status as PatentStatus) || undefined,
    source: (source as 'KIPRIS' | 'USPTO') || undefined,
    ipcCode: ipcCode || undefined,
    expiryDays: expiryDays ? Number(expiryDays) : undefined,
    sortBy: sortBy as 'filing_date' | 'expiry_date' | 'registration_date' | 'created_at',
    sortOrder: sortOrder as 'asc' | 'desc',
    page,
    pageSize: 20,
  })

  const patents = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-6">
      {/* 페이지 히어로 */}
      <div className="rounded-xl border border-primary/10 bg-primary/5 p-5 space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">특허 검색</h1>
          <p className="text-muted-foreground text-sm mt-0.5">KIPRIS 특허 공보를 검색하고 주시하세요.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 h-11 bg-background shadow-sm"
            placeholder="발명 명칭, 출원인명으로 검색..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={(v) => { setStatus(v === 'ALL' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-30">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 상태</SelectItem>
              <SelectItem value="PENDING">출원중</SelectItem>
              <SelectItem value="REGISTERED">등록</SelectItem>
              <SelectItem value="EXPIRED">만료</SelectItem>
              <SelectItem value="REJECTED">거절</SelectItem>
              <SelectItem value="WITHDRAWN">취하</SelectItem>
            </SelectContent>
          </Select>

          <Select value={source} onValueChange={(v) => { setSource(v === 'ALL' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[27.5]">
              <SelectValue placeholder="출처" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 출처</SelectItem>
              <SelectItem value="KIPRIS">KIPRIS</SelectItem>
              <SelectItem value="USPTO">USPTO</SelectItem>
            </SelectContent>
          </Select>

          <Input
            className="w-32.5"
            placeholder="IPC 코드"
            value={ipcCode}
            onChange={(e) => { setIpcCode(e.target.value); setPage(1) }}
          />

          <Select value={expiryDays} onValueChange={(v) => { setExpiryDays(v === 'ALL' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-32.5">
              <SelectValue placeholder="만료 D-day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체</SelectItem>
              <SelectItem value="30">30일 이내</SelectItem>
              <SelectItem value="90">90일 이내</SelectItem>
              <SelectItem value="180">180일 이내</SelectItem>
              <SelectItem value="365">1년 이내</SelectItem>
            </SelectContent>
          </Select>

          {/* 정렬 */}
          <div className="flex gap-1">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
              <SelectTrigger className="w-[27.5]">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">수집일</SelectItem>
                <SelectItem value="filing_date">출원일</SelectItem>
                <SelectItem value="expiry_date">만료일</SelectItem>
                <SelectItem value="registration_date">등록일</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>
        </div>

      {/* 결과 카운트 */}
      {data && (
        <p className="text-sm text-muted-foreground">
          총 <span className="font-semibold text-foreground">{data.total.toLocaleString()}</span>건
        </p>
      )}

      {/* 테이블 */}
      <div className="rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-muted/40">
              <TableHead className="w-35">출원번호</TableHead>
              <TableHead>발명명칭</TableHead>
              <TableHead className="w-35">출원인</TableHead>
              <TableHead className="w-35">IPC 코드</TableHead>
              <TableHead className="w-25">출원일</TableHead>
              <TableHead className="w-25">만료일</TableHead>
              <TableHead className="w-20">상태</TableHead>
              <TableHead className="w-15">주시</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : patents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              patents.map((patent: Patent) => {
                const statusInfo = STATUS_BADGES[patent.status] ?? { label: patent.status, variant: 'outline' as const }
                const daysLabel = formatDaysToExpiry(patent.expiry_date)
                const isExpiringSoon =
                  patent.days_to_expiry !== null &&
                  patent.days_to_expiry !== undefined &&
                  patent.days_to_expiry <= 30 &&
                  patent.days_to_expiry >= 0

                return (
                  <TableRow key={patent.id} className="cursor-pointer hover:bg-primary/5 transition-colors">
                    <TableCell className="font-mono text-xs">
                      <Link href={`/patents/${patent.id}`} className="hover:underline text-primary">
                        {patent.source_patent_id}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-70">
                      <Link
                        href={`/patents/${patent.id}`}
                        className="hover:underline font-medium line-clamp-2"
                      >
                        {patent.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-35">
                      {patent.applicant_name ?? '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {patent.ipc_codes.slice(0, 2).map((code) => (
                          <Badge key={code} variant="outline" className="text-xs font-mono">
                            {code}
                          </Badge>
                        ))}
                        {patent.ipc_codes.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{patent.ipc_codes.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {patent.filing_date ?? '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          isExpiringSoon
                            ? 'text-destructive font-semibold text-sm'
                            : 'text-sm text-muted-foreground'
                        }
                      >
                        {daysLabel}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <WatchButton patent={patent} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    isActive={pageNum === page}
                    onClick={() => setPage(pageNum)}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
