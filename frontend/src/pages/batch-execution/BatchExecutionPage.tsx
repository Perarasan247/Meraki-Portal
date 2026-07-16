import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ListChecks, CheckCircle2, CircleDashed, Loader2,
  User, CalendarRange, Users, Monitor, Clock,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Label, Select, Textarea } from '@/components/ui/input'
import { Ring } from '@/components/ui/progress'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils'
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

const STATUS_ICON: Record<PhaseStatus, typeof CheckCircle2> = {
  'Not Started': CircleDashed,
  'In Progress': Loader2,
  Completed: CheckCircle2,
}

// Timeline node ring around the status icon.
const NODE_TONE: Record<PhaseStatus, string> = {
  'Not Started': 'border-(--color-border) bg-(--color-muted) text-(--color-muted-foreground)',
  'In Progress': 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  Completed: 'border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
}

// Active segment of the per-phase status toggle.
const STATUS_ACTIVE: Record<PhaseStatus, string> = {
  'Not Started': 'bg-(--color-card) text-(--color-foreground) shadow-sm ring-1 ring-(--color-border)',
  'In Progress': 'bg-amber-500 text-white shadow-sm',
  Completed: 'bg-emerald-500 text-white shadow-sm',
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
      setCurriculumId(match ? match.id : '')
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
  const notStartedPhases = totalPhases - completedPhases - inProgressPhases
  const pctOf = (n: number) => (totalPhases > 0 ? (n / totalPhases) * 100 : 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Execution"
        subtitle="Track each batch's curriculum progress"
        icon={ListChecks}
      />

      {/* Batch + curriculum picker */}
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="batch-select">Batch</Label>
            <Select id="batch-select" value={batchId} onChange={(e) => handleBatchChange(e.target.value)} disabled={isLoading}>
              <option value="">Choose a batch…</option>
              {(batches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.batch_name} ({b.program})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="curriculum-select">Linked curriculum</Label>
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
          title="Select a batch to track progress"
          description="Pick a batch and its curriculum above to see and update phase-by-phase completion."
        />
      ) : executionQuery.isLoading || createExecution.isPending ? (
        <Card><CardContent className="p-5"><TableSkeleton rows={4} /></CardContent></Card>
      ) : !execution || !selectedCurriculum ? (
        <EmptyState icon={ListChecks} title="Could not load progress tracker" description="Try selecting the batch again." />
      ) : (
        <>
          {/* ---- Batch summary + progress overview ---- */}
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <Ring value={execution.progress_pct} tone="accent" size={92} stroke={8} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold text-(--color-foreground)">
                      {selectedBatch?.batch_name}
                    </p>
                    <p className="truncate text-sm text-(--color-muted-foreground)">{selectedCurriculum.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="primary">{selectedCurriculum.program}</Badge>
                      {selectedBatch?.status && <StatusBadge status={selectedBatch.status} />}
                    </div>
                  </div>
                </div>

                {/* Batch context — trainer / schedule / mode / seats */}
                <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                  <Meta icon={User} label="Trainer" value={selectedBatch?.trainer || '—'} />
                  <Meta
                    icon={CalendarRange}
                    label="Schedule"
                    value={
                      selectedBatch?.start_date
                        ? `${formatDate(selectedBatch.start_date)}${selectedBatch.end_date ? ` – ${formatDate(selectedBatch.end_date)}` : ''}`
                        : '—'
                    }
                  />
                  <Meta icon={Monitor} label="Mode" value={selectedBatch?.mode || '—'} />
                  <Meta
                    icon={Users}
                    label="Seats"
                    value={selectedBatch ? `${selectedBatch.seats_filled}/${selectedBatch.seats_total}` : '—'}
                  />
                </div>
              </div>

              {/* Stacked completion bar + legend */}
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-(--color-foreground)">Curriculum completion</span>
                  <span className="font-display font-bold tabular-nums text-(--color-foreground)">
                    {completedPhases}<span className="text-(--color-muted-foreground)">/{totalPhases} phases · {execution.progress_pct}%</span>
                  </span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-(--color-muted)" role="img"
                  aria-label={`${completedPhases} of ${totalPhases} phases completed, ${inProgressPhases} in progress`}>
                  <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${pctOf(completedPhases)}%` }} />
                  <div className="bg-amber-500 transition-all duration-500" style={{ width: `${pctOf(inProgressPhases)}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                  <Legend dot="bg-emerald-500" label="Completed" count={completedPhases} />
                  <Legend dot="bg-amber-500" label="In progress" count={inProgressPhases} />
                  <Legend dot="bg-(--color-muted-foreground)/40" label="Not started" count={notStartedPhases} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ---- Phase-by-phase tracker ---- */}
          {totalPhases === 0 ? (
            <EmptyState icon={ListChecks} title="This curriculum has no phases defined." description="Add sections to the curriculum first, then track them here." />
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
                    <Card className="transition-colors hover:border-(--color-ring)/40">
                      <CardContent className="p-4">
                        <div className="min-w-0">
                          <p className="font-medium text-(--color-foreground)">{phase.title}</p>
                          {phase.description && (
                            <p className="mt-0.5 text-sm text-(--color-muted-foreground)">{phase.description}</p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--color-muted-foreground)">
                            {phase.estimated_duration && (
                              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {phase.estimated_duration}</span>
                            )}
                            {progress.status === 'Completed' && progress.completed_at && (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Completed {formatDate(progress.completed_at)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Segmented status toggle — one tap to set state */}
                        <div className="mt-3 inline-flex rounded-lg border border-(--color-border) bg-(--color-muted) p-0.5">
                          {PHASE_STATUSES.map((s) => {
                            const active = progress.status === s
                            return (
                              <button
                                key={s}
                                type="button"
                                aria-pressed={active}
                                onClick={() => { if (!active) updatePhase(phase.id, { status: s }) }}
                                className={cn(
                                  'cursor-pointer rounded-md px-3.5 py-2 text-xs font-medium transition-colors',
                                  active ? STATUS_ACTIVE[s] : 'text-(--color-muted-foreground) hover:text-(--color-foreground)',
                                )}
                              >
                                {s}
                              </button>
                            )
                          })}
                        </div>

                        <Textarea
                          aria-label={`Notes for ${phase.title}`}
                          placeholder="Add a note for this phase…"
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

/** A labelled batch-context field with an icon. */
function Meta({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-medium text-(--color-muted-foreground)">
        <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
      </div>
      <p className="mt-0.5 truncate text-sm font-semibold text-(--color-foreground)" title={value}>{value}</p>
    </div>
  )
}

function Legend({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-(--color-muted-foreground)">
      <span className={cn('h-2.5 w-2.5 rounded-full', dot)} />
      {label} <span className="font-semibold tabular-nums text-(--color-foreground)">{count}</span>
    </span>
  )
}
