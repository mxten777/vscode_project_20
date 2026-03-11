'use client'

import * as React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Bell, BellOff, Pencil, Trash2, Globe, Users, Tag, Clock } from 'lucide-react'
import {
  useAlertRules,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
  useAlertLogs,
} from '@/hooks/use-api'
import { alertRuleCreateSchema } from '@/lib/validations'
import type { AlertRule, AlertType, AlertChannel, AlertLog } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { z } from 'zod'

type AlertRuleForm = z.infer<typeof alertRuleCreateSchema>

const TYPE_ICONS: Record<AlertType, React.ElementType> = {
  KEYWORD: Globe,
  COMPETITOR: Users,
  IPC: Tag,
  EXPIRY: Clock,
}

const TYPE_LABELS: Record<AlertType, string> = {
  KEYWORD: '키워드',
  COMPETITOR: '경쟁사',
  IPC: 'IPC 코드',
  EXPIRY: '만료 임박',
}

const CHANNEL_LABELS: Record<AlertChannel, string> = {
  EMAIL: '이메일',
  KAKAO: '카카오',
}

export default function AlertsPage() {
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AlertRule | undefined>(undefined)

  const { data: rules = [], isLoading: rulesLoading } = useAlertRules()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">알림 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            특허 변동 사항을 자동으로 감지하여 알림을 받을 수 있습니다.
          </p>
        </div>
        <Dialog
          open={ruleDialogOpen}
          onOpenChange={(v) => {
            setRuleDialogOpen(v)
            if (!v) setEditTarget(undefined)
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditTarget(undefined)}>
              <Plus className="h-4 w-4 mr-1" />
              알림 규칙 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editTarget ? '알림 규칙 수정' : '알림 규칙 추가'}</DialogTitle>
            </DialogHeader>
            <RuleForm
              defaultValues={editTarget}
              onClose={() => {
                setRuleDialogOpen(false)
                setEditTarget(undefined)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">알림 규칙</TabsTrigger>
          <TabsTrigger value="logs">발송 로그</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 space-y-3">
          {rulesLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : rules.length === 0 ? (
            <div className="text-center py-16 border rounded-xl">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">등록된 알림 규칙이 없습니다.</p>
            </div>
          ) : (
            rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={(r) => {
                  setEditTarget(r)
                  setRuleDialogOpen(true)
                }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ---------- Rule Card ---------- */
function RuleCard({
  rule,
  onEdit,
}: {
  rule: AlertRule
  onEdit: (r: AlertRule) => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { mutate: updateRule, isPending: updating } = useUpdateAlertRule()
  const { mutate: deleteRule, isPending: deleting } = useDeleteAlertRule()

  const Icon = TYPE_ICONS[rule.type] ?? Bell

  const handleToggle = (v: boolean) => {
    updateRule(
      { id: rule.id, data: { is_enabled: v } },
      {
        onSuccess: () => toast.success(v ? '알림 규칙이 활성화되었습니다.' : '알림 규칙이 비활성화되었습니다.'),
        onError: () => toast.error('처리 중 오류가 발생했습니다.'),
      },
    )
  }

  const conditionSummary = () => {
    const c = rule.rule_json
    if (rule.type === 'KEYWORD') return `키워드: "${c.keyword ?? ''}"`
    if (rule.type === 'COMPETITOR') return `출원인: "${c.applicantName ?? ''}"`
    if (rule.type === 'IPC') return `IPC: ${(c.ipcCodes ?? []).join(', ')}`
    if (rule.type === 'EXPIRY') {
      const days = c.daysBeforeExpiry ?? []
      return `만료 ${days.map((d) => `D-${d}`).join(', ')} 알림`
    }
    return JSON.stringify(c)
  }

  return (
    <>
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{rule.name}</span>
              <Badge variant="outline" className="text-xs">
                {TYPE_LABELS[rule.type]}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {CHANNEL_LABELS[rule.channel]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{conditionSummary()}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={rule.is_enabled}
              onCheckedChange={handleToggle}
              disabled={updating}
              aria-label="알림 활성화"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(rule)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive/80"
              onClick={() => setDeleteOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>알림 규칙 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{rule.name}&quot; 규칙을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteRule(rule.id, {
                  onSuccess: () => toast.success('알림 규칙이 삭제되었습니다.'),
                  onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
                })
              }
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ---------- Rule Form ---------- */
function RuleForm({
  defaultValues,
  onClose,
}: {
  defaultValues?: AlertRule
  onClose: () => void
}) {
  const isEdit = !!defaultValues?.id
  const { mutate: createRule, isPending: creating } = useCreateAlertRule()
  const { mutate: updateRule, isPending: updating } = useUpdateAlertRule()

  const existingJson = defaultValues?.rule_json

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AlertRuleForm>({
    resolver: zodResolver(alertRuleCreateSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      type: defaultValues?.type ?? 'KEYWORD',
      channel: defaultValues?.channel ?? 'EMAIL',
      rule_json: existingJson ?? {},
      is_enabled: defaultValues?.is_enabled ?? true,
    },
  })

  const selectedType = watch('type')
  const [ipcInput, setIpcInput] = useState(
    (existingJson?.ipcCodes ?? []).join(', '),
  )
  const [expiryDays, setExpiryDays] = useState<number[]>(
    existingJson?.daysBeforeExpiry ?? [],
  )

  const handleTypeChange = (v: string) => {
    setValue('type', v as AlertType)
    setValue('rule_json', {})
  }

  const toggleExpiryDay = (day: number) => {
    const next = expiryDays.includes(day)
      ? expiryDays.filter((d) => d !== day)
      : [...expiryDays, day]
    setExpiryDays(next)
    setValue('rule_json', { daysBeforeExpiry: next })
  }

  const onSubmit = (data: AlertRuleForm) => {
    if (isEdit && defaultValues?.id) {
      updateRule(
        { id: defaultValues.id, data },
        {
          onSuccess: () => { toast.success('알림 규칙이 수정되었습니다.'); onClose() },
          onError: () => toast.error('처리 중 오류가 발생했습니다.'),
        },
      )
    } else {
      createRule(data, {
        onSuccess: () => { toast.success('알림 규칙이 추가되었습니다.'); onClose() },
        onError: () => toast.error('처리 중 오류가 발생했습니다.'),
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
      <div className="space-y-2">
        <Label>규칙 이름</Label>
        <Input {...register('name')} placeholder="예: 삼성 특허 모니터링" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>알림 유형</Label>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>알림 채널</Label>
          <Select
            value={watch('channel')}
            onValueChange={(v) => setValue('channel', v as AlertChannel)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* 동적 조건 폼 */}
      {selectedType === 'KEYWORD' && (
        <div className="space-y-2">
          <Label>검색 키워드</Label>
          <Input
            placeholder="예: 배터리 전극"
            defaultValue={existingJson?.keyword ?? ''}
            onChange={(e) => setValue('rule_json', { keyword: e.target.value })}
          />
        </div>
      )}

      {selectedType === 'COMPETITOR' && (
        <div className="space-y-2">
          <Label>출원인 이름</Label>
          <Input
            placeholder="예: 삼성전자"
            defaultValue={existingJson?.applicantName ?? ''}
            onChange={(e) => setValue('rule_json', { applicantName: e.target.value })}
          />
        </div>
      )}

      {selectedType === 'IPC' && (
        <div className="space-y-2">
          <Label>IPC 코드 (쉼표로 구분)</Label>
          <Input
            placeholder="예: H01M, G06F"
            value={ipcInput}
            onChange={(e) => {
              setIpcInput(e.target.value)
              const codes = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
              setValue('rule_json', { ipcCodes: codes })
            }}
          />
        </div>
      )}

      {selectedType === 'EXPIRY' && (
        <div className="space-y-2">
          <Label>만료 알림 기준</Label>
          <div className="flex flex-wrap gap-2">
            {[1, 7, 30, 90, 180].map((day) => (
              <Button
                key={day}
                type="button"
                variant={expiryDays.includes(day) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleExpiryDay(day)}
              >
                D-{day}
              </Button>
            ))}
          </div>
          {expiryDays.length === 0 && (
            <p className="text-xs text-muted-foreground">하나 이상의 기준을 선택해주세요.</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" disabled={creating || updating}>
          {isEdit ? '수정' : '추가'}
        </Button>
      </div>
    </form>
  )
}

/* ---------- Logs Tab ---------- */
function LogsTab() {
  const { data: logs = [], isLoading } = useAlertLogs(50)

  return (
    <div className="space-y-2">
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)
      ) : logs.length === 0 ? (
        <div className="text-center py-16 border rounded-xl">
          <BellOff className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">발송된 알림이 없습니다.</p>
        </div>
      ) : (
        (logs as AlertLog[]).map((log) => {
          const rule = log.alert_rule
          return (
            <Card key={log.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {rule?.name ?? '삭제된 규칙'}
                    </span>
                    {rule && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {TYPE_LABELS[rule.type]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    특허 ID: {log.patent_id} &middot;{' '}
                    {log.sent_at ? new Date(log.sent_at).toLocaleString('ko-KR') : '-'}
                  </p>
                </div>
                <Badge
                  variant={log.status === 'SENT' ? 'success' : 'destructive'}
                  className="text-xs shrink-0"
                >
                  {log.status === 'SENT' ? '발송됨' : '실패'}
                </Badge>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
