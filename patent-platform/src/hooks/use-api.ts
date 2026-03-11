'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import type {
  Patent,
  WatchlistItem,
  AlertRule,
  AlertLog,
  ReportSummary,
  PaginatedResponse,
} from '@/lib/types'
import type { PatentSearchParams, AlertRuleCreateInput, AlertRuleUpdateInput, ReportQueryParams } from '@/lib/validations'

// ============================================================
// API 헬퍼
// ============================================================

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = (await res.json()) as { success: boolean; data?: T; message?: string }
  if (!res.ok || !json.success) {
    throw new Error((json as { message?: string }).message ?? `HTTP ${res.status}`)
  }
  return json.data as T
}

function buildSearchParams(params: Partial<PatentSearchParams>): string {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value))
    }
  })
  return sp.toString()
}

// ============================================================
// 특허 훅
// ============================================================

export function usePatents(
  params: Partial<PatentSearchParams> = {},
): UseQueryResult<PaginatedResponse<Patent>, Error> {
  return useQuery({
    queryKey: ['patents', params],
    queryFn: () =>
      apiFetch<PaginatedResponse<Patent>>(`/api/patents?${buildSearchParams(params)}`),
  })
}

export function usePatent(id: string): UseQueryResult<Patent, Error> {
  return useQuery({
    queryKey: ['patents', id],
    queryFn: () => apiFetch<Patent>(`/api/patents/${id}`),
    enabled: Boolean(id),
  })
}

// ============================================================
// 주시 목록 훅
// ============================================================

export function useWatchlist(): UseQueryResult<WatchlistItem[], Error> {
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: () => apiFetch<WatchlistItem[]>('/api/watchlist'),
  })
}

export function useToggleWatch(patentId: string): UseMutationResult<
  Patent,
  Error,
  { isWatched: boolean }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ isWatched }) =>
      apiFetch<Patent>(`/api/watchlist/${patentId}`, {
        method: isWatched ? 'DELETE' : 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      queryClient.invalidateQueries({ queryKey: ['patents'] })
      queryClient.invalidateQueries({ queryKey: ['patents', patentId] })
    },
  })
}

export function useUpdateWatchlistNote(
  itemId: string,
): UseMutationResult<WatchlistItem, Error, { note: string | null }> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ note }) =>
      apiFetch<WatchlistItem>(`/api/watchlist/${itemId}/note`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })
}

// ============================================================
// 알림 규칙 훅
// ============================================================

export function useAlertRules(): UseQueryResult<AlertRule[], Error> {
  return useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => apiFetch<AlertRule[]>('/api/alerts/rules'),
  })
}

export function useCreateAlertRule(): UseMutationResult<AlertRule, Error, AlertRuleCreateInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input) =>
      apiFetch<AlertRule>('/api/alerts/rules', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
    },
  })
}

export function useUpdateAlertRule(): UseMutationResult<
  AlertRule,
  Error,
  { id: string; data: AlertRuleUpdateInput }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) =>
      apiFetch<AlertRule>(`/api/alerts/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
    },
  })
}

export function useDeleteAlertRule(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) =>
      apiFetch<void>(`/api/alerts/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
    },
  })
}

// ============================================================
// 알림 로그 훅
// ============================================================

export function useAlertLogs(limit = 50): UseQueryResult<AlertLog[], Error> {
  return useQuery({
    queryKey: ['alert-logs', limit],
    queryFn: () => apiFetch<AlertLog[]>(`/api/alerts/logs?limit=${limit}`),
  })
}

// ============================================================
// 리포트 훅
// ============================================================

export function useReportSummary(
  params: ReportQueryParams = {},
): UseQueryResult<ReportSummary, Error> {
  return useQuery({
    queryKey: ['report-summary', params],
    queryFn: () =>
      apiFetch<ReportSummary>(`/api/reports/summary?${buildSearchParams(params as Record<string, string>)}`),
  })
}
