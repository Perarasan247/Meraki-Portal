import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ListChecks, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Label, Select, Textarea } from '@/components/ui/input'
import { Ring, Meter } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Batch, Curriculum } from '@/lib/types'

type PhaseStatus = 'Not Started' | 'In Progress' | 'Completed'
const PHASE_STATUSES: PhaseStatus[] = ['Not Started', 'In Progress', 'Completed']

interface PhaseProgressEntry {
  phase_id: string
  status: PhaseStatus
  notes: string | null
  completed_at: string | null
}

interface BatchExecution {
  id: string
  branch_id: string
  batch_id: string
  curriculum_id: string
  phase_progress: PhaseProgressEntry[]
  progress_pct: number
  updated_at: string
}

type Tone = 'primary' | 'accent' | 'warning' | 'danger'

const STATUS_TONE: Record<PhaseStatus, Tone> = {
  'Not Started': 'primary',
  'In Progress': 'warning',
  Completed: 'accent',
}

const STATUS_BADGE: Record<PhaseStatus, 'default' | 'warning' | 'success'> = {
  'Not Started': 'default',
  'In Progress': 'warning',
  Completed: 'success',
}

const STATUS_ICON: Record<PhaseStatus, typeof CheckCircle2> = {
  'Not Started': CircleDashed,
  'In Progress': Loader2,
  Completed: CheckCircle2,
}

const NODE_TONE: Record<PhaseStatus, string> = {
  'Not Started': 'border-(--color-border) bg-(--color-muted) text-(--color-muted-foreground)',
  'In Progress': 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  Completed: 'border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
}

function useBatches() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['batches', branchParam],
    queryFn: () => api.get<Batch[]>(`/batches${branchParam ? `?${branchParam}` : ''}`),
  })
}

function useCurricula() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['curricula', branchParam],
    queryFn: () => api.get<Curriculum[]>(`/curricula${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function BatchExecutionPage() {
  const { data: batches, isLoading: batchesLoading } = useBatches()
  const { data: curricula, isLoading: curriculaLoading } = useCurricula()
  const [batchId, setBatchId] = React.useState('')
  const [curriculumId, setCurriculumId] = React.useState('')
  const queryClient = useQueryClient()

  const selectedBatch = (batches ?? []).find((b) => b.id === batchId) ?? null
  const selectedCurriculum = (curricula ?? []).find((c) => c.id === curriculumId) ?? null

  function handleBatchChange(id: string) {
    setBatchId(id)
    const batch = (batches ?? []).find((b) => b.id === id)
    if (batch) {
      const match = (curricula ?? []).find((c) => c.program === batch.program)
      if (match) setCurriculumId(match.id)
    }
  }

  const executionQuery = useQuery({
    queryKey: ['batch-execution', batchId],
    queryFn: () => api.get<BatchExecution>(`/batch-execution/by-batch/${batchId}`),
    enabled: !!batchId && !!curriculumId,
    retry: false,
  })

  const createExecution = useMutation({
    mutationFn: () => api.post<BatchExecution>('/batch-execution', { batch_id: batchId, curriculum_id: curriculumId }),
    onSuccess: (row) => {
      queryClient.setQueryData(['batch-execution', batchId], row)
    },
    onError: () => toast.error('Could not link curriculum to batch'),
  })

  const createExecutionMutate = createExecution.mutate
  React.useEffect(() => {
    if (!batchId || !curriculumId) return
    if (executionQuery.isError && executionQuery.error instanceof ApiError && executionQuery.error.status === 404) {
      createExecutionMutate()
    }
  }, [batchId, curriculumId, executionQuery.isError, executionQuery.error, createExecutionMutate])

  const execution = executionQuery.data ?? (createExecution.data ?? null)

  const updateProgress = useMutation({
    mutationFn: (phaseProgress: PhaseProgressEntry[]) =>
      api.patch<BatchExecution>(`/batch-execution/${execution!.id}`, { phase_progress: phaseProgress }),
    onSuccess: (row) => {
      queryClient.setQueryData(['batch-execution', batchId], row)
      toast.success('Progress updated')
    },
    onError: () => toast.error('Could not update progress'),
  })

  function progressFor(phaseId: string): PhaseProgressEntry {
    const found = execution?.phase_progress.find((p) => p.phase_id === phaseId)
    return found ?? { phase_id: phaseId, status: 'Not Started', notes: null, completed_at: null }
  }

  function updatePhase(phaseId: string, patch: Partial<PhaseProgressEntry>) {
    if (!execution || !selectedCurriculum) return
    const byId = new Map(execution.phase_progress.map((p) => [p.phase_id, p]))
    for (const phase of selectedCurriculum.phases) {
      if (!byId.has(phase.id)) byId.set(phase.id, { phase_id: phase.id, status: 'Not Started', notes: null, completed_at: null })
    }
    const current = byId.get(phaseId)!
    const updated: PhaseProgressEntry = {
      ...current,
      ...patch,
      completed_at: patch.status === 'Completed' ? new Date().toISOString() : patch.status ? null : current.completed_at,
    }
    byId.set(phaseId, updated)
    updateProgress.mutate(selectedCurriculum.phases.map((phase) => byId.get(phase.id)!))
  }

  const isLoading = batchesLoading || curriculaLoading

  const sortedPhases = React.useMemo(
    () => (selectedCurriculum?.phases ?? []).slice().sort((a, b) => a.order - b.order),
    [selectedCurriculum],
  )
  const totalPhases = sortedPhases.length
  const completedPhases = sortedPhases.filter((p) => progressFor(p.id).status === 'Completed').length
  const inProgressPhases = sortedPhases.filter((p) => progressFor(p.id).status === 'In Progress').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Execution"
        subtitle="Attendance & progress tracking"
        icon={ListChecks}
      />

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="batch-select">Select Batch</Label>
            <Select id="batch-select" value={batchId} onChange={(e) => handleBatchChange(e.target.value)} disabled={isLoading}>
              <option value="">Choose a batch…</option>
              {(batches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.batch_name} ({b.program})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="curriculum-select">Linked Curriculum</Label>
            <Select id="curriculum-select" value={curriculumId} onChange={(e) => setCurriculumId(e.target.value)} disabled={isLoading}>
              <option value="">Choose a curriculum…</option>
              {(curricula ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c.program})</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {!batchId || !curriculumId ? (
        <EmptyState
          icon={ListChecks}
          title="Select a batch above to view and track its curriculum progress."
        />
      ) : executionQuery.isLoading || createExecution.isPending ? (
        <Card><CardContent className="p-5"><TableSkeleton rows={4} /></CardContent></Card>
      ) : !execution || !selectedCurriculum ? (
        <EmptyState icon={ListChecks} title="Could not load progress tracker" description="Try selecting the batch again." />
      ) : (
        <>
          {/* Tracker hero — foreground the progress with a ring + meters */}
          <Card>
            <CardContent className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <Ring value={execution.progress_pct} tone="accent" size={92} stroke={8} />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-(--color-foreground)">
                    {selectedBatch?.batch_name}
                  </p>
                  <p className="truncate text-sm text-(--color-muted-foreground)">{selectedCurriculum.title}</p>
                  <Badge variant="primary" className="mt-2">{selectedCurriculum.program}</Badge>
                </div>
              </div>

              <div className="grid flex-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-(--color-muted-foreground)">Phases completed</p>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums">
                    {completedPhases}<span className="text-(--color-muted-foreground)">/{totalPhases}</span>
                  </p>
                  <Meter value={completedPhases} max={totalPhases || 1} tone="accent" className="mt-2" />
                </div>
                <div>
                  <p className="text-xs font-medium text-(--color-muted-foreground)">In progress</p>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums">
                    {inProgressPhases}<span className="text-(--color-muted-foreground)">/{totalPhases}</span>
                  </p>
                  <Meter value={inProgressPhases} max={totalPhases || 1} tone="warning" className="mt-2" />
                </div>
                <div>
                  <p className="text-xs font-medium text-(--color-muted-foreground)">Completion rate</p>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums">{execution.progress_pct}%</p>
                  <Meter value={execution.progress_pct} tone="primary" className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phase timeline — progress-annotated list */}
          {totalPhases === 0 ? (
            <EmptyState icon={ListChecks} title="This curriculum has no phases defined." />
          ) : (
            <ol className="relative space-y-4 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-(--color-border)">
              {sortedPhases.map((phase) => {
                const progress = progressFor(phase.id)
                const Icon = STATUS_ICON[progress.status]
                return (
                  <li key={phase.id} className="relative pl-12">
                    <span
                      className={cn(
                        'absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2',
                        NODE_TONE[progress.status],
                      )}
                      aria-hidden
                    >
                      <Icon className={cn('h-4 w-4', progress.status === 'In Progress' && 'animate-spin')} />
                    </span>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{phase.title}</p>
                              <Badge variant={STATUS_BADGE[progress.status]}>{progress.status}</Badge>
                            </div>
                            {phase.description && (
                              <p className="mt-0.5 text-sm text-(--color-muted-foreground)">{phase.description}</p>
                            )}
                            {phase.estimated_duration && (
                              <p className="mt-0.5 text-xs text-(--color-muted-foreground)">Est. {phase.estimated_duration}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Ring
                              value={progress.status === 'Completed' ? 100 : progress.status === 'In Progress' ? 50 : 0}
                              tone={STATUS_TONE[progress.status]}
                              size={40}
                              stroke={4}
                            />
                            <Select
                              value={progress.status}
                              onChange={(e) => updatePhase(phase.id, { status: e.target.value as PhaseStatus })}
                              className="h-9 w-40 cursor-pointer"
                            >
                              {PHASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </Select>
                          </div>
                        </div>
                        <Textarea
                          placeholder="Notes…"
                          defaultValue={progress.notes ?? ''}
                          onBlur={(e) => {
                            if (e.target.value !== (progress.notes ?? '')) updatePhase(phase.id, { notes: e.target.value || null })
                          }}
                          className="mt-3 min-h-16"
                        />
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ol>
          )}
        </>
      )}
    </div>
  )
}
