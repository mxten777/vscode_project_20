'use client'

import * as React from 'react'
import { useState } from 'react'
import { format, subMonths, startOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon, TrendingUp, Clock, FileText, Users } from 'lucide-react'
import { useReportSummary } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'

const PIE_COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6']

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState<Date>(() => subMonths(startOfMonth(new Date()), 5))
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)

  const params = {
    from: dateFrom.toISOString(),
    to: dateTo.toISOString(),
  }

  const { data, isLoading } = useReportSummary(params)
  const summary = data

  const registeredCount = summary?.by_status?.find((s) => s.status === 'REGISTERED')?.count
  const expiringCount = summary?.expiring_soon?.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">분석 리포트</h1>
        <p className="text-sm text-muted-foreground mt-1">
          기간별 특허 트렌드 및 현황을 분석합니다.
        </p>
      </div>

      {/* 기간 선택 */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">기간 선택:</span>
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(dateFrom, 'yyyy.MM.dd')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(d) => { if (d) { setDateFrom(d); setFromOpen(false) } }}
              locale={ko}
              disabled={(d) => d > dateTo}
            />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground text-sm">~</span>
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(dateTo, 'yyyy.MM.dd')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(d) => { if (d) { setDateTo(d); setToOpen(false) } }}
              locale={ko}
              disabled={(d) => d < dateFrom}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          title="전체 특허"
          value={summary?.total_patents}
          icon={FileText}
          isLoading={isLoading}
          iconClass="bg-indigo-500"
        />
        <SummaryCard
          title="등록 특허"
          value={registeredCount}
          icon={TrendingUp}
          isLoading={isLoading}
          iconClass="bg-emerald-500"
        />
        <SummaryCard
          title="만료 임박 (30일)"
          value={expiringCount}
          icon={Clock}
          isLoading={isLoading}
          iconClass="bg-orange-500"
        />
        <SummaryCard
          title="상태 분류"
          value={summary?.by_status?.length}
          icon={Users}
          isLoading={isLoading}
          iconClass="bg-violet-500"
        />
      </div>

      {/* 차트 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 월별 출원 추이 LineChart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">월별 출원 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56" />
            ) : summary?.monthly_filings?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={summary.monthly_filings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={30} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="출원 수"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        {/* 상태별 분포 PieChart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">상태별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56" />
            ) : summary?.by_status?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={summary.by_status.filter((s) => s.count > 0)}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="46%"
                    outerRadius={88}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius: or,
                      percent,
                      name,
                    }: {
                      cx: number; cy: number; midAngle: number
                      innerRadius: number; outerRadius: number
                      percent: number; name: string
                    }) => {
                      if (percent < 0.05) return null
                      const RADIAN = Math.PI / 180
                      const radius = innerRadius + (or - innerRadius) * 0.55
                      const x = cx + radius * Math.cos(-midAngle * RADIAN)
                      const y = cy + radius * Math.sin(-midAngle * RADIAN)
                      return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      )
                    }}
                    labelLine={false}
                  >
                    {summary.by_status
                      .filter((s) => s.count > 0)
                      .map((_entry: unknown, index: number) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}건`, '특허 수']} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        {/* 출원인 TOP10 가로 BarChart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">출원인 TOP 10</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56" />
            ) : summary?.top_applicants?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.top_applicants} layout="vertical" margin={{ left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="applicant_name"
                    width={80}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" name="특허 수" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        {/* IPC TOP10 가로 BarChart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">IPC 분류 TOP 10</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56" />
            ) : summary?.top_ipc?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.top_ipc} layout="vertical" margin={{ left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="ipc_code"
                    width={70}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="특허 수" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 만료 임박 테이블 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            만료 임박 특허
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : summary?.expiring_soon?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-4 font-medium">발명 명칭</th>
                    <th className="text-left py-2 pr-4 font-medium">출원인</th>
                    <th className="text-left py-2 pr-4 font-medium">만료일</th>
                    <th className="text-right py-2 font-medium">D-Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summary.expiring_soon.map((p) => {
                    const daysLeft = p.days_to_expiry ?? 0
                    return (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 pr-4 font-medium max-w-xs truncate">
                          {p.title}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{p.applicant_name ?? '-'}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{p.expiry_date ?? '-'}</td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={daysLeft <= 7 ? 'destructive' : daysLeft <= 30 ? 'warning' : 'secondary'}
                          >
                            D-{daysLeft}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              만료 임박 특허가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  isLoading,
  iconClass,
}: {
  title: string
  value?: number
  icon: React.ElementType
  isLoading: boolean
  iconClass?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs text-muted-foreground font-medium">{title}</CardTitle>
        <div className={`p-1.5 rounded-md ${iconClass ?? 'bg-muted'}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold tracking-tight">
            {value?.toLocaleString('ko-KR') ?? '0'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyChart() {
  return (
    <div className="h-55 flex items-center justify-center text-sm text-muted-foreground">
      표시할 데이터가 없습니다.
    </div>
  )
}
