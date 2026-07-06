import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ListChecks } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label, Select, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Batch Execution Tracker</h1>
        <p className="mt-1 text-sm text-(--color-muted-foreground)">Track curriculum progress for a running batch.</p>
      </div>

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
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle>{selectedBatch?.batch_name} — {selectedCurriculum.title}</CardTitle>
              <span className="font-display text-lg font-bold tabular-nums">{execution.progress_pct}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-(--color-muted)">
              <div
                className="h-2.5 rounded-full bg-(--color-accent) transition-all"
                style={{ width: `${execution.progress_pct}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCurriculum.phases.length === 0 ? (
              <p className="text-sm text-(--color-muted-foreground)">This curriculum has no phases defined.</p>
            ) : (
              selectedCurriculum.phases
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((phase) => {
                  const progress = progressFor(phase.id)
                  return (
                    <div key={phase.id} className="rounded-lg border border-(--color-border) p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{phase.title}</p>
                          {phase.description && <p className="mt-0.5 text-sm text-(--color-muted-foreground)">{phase.description}</p>}
                          {phase.estimated_duration && (
                            <p className="mt-0.5 text-xs text-(--color-muted-foreground)">Est. {phase.estimated_duration}</p>
                          )}
                        </div>
                        <Select
                          value={progress.status}
                          onChange={(e) => updatePhase(phase.id, { status: e.target.value as PhaseStatus })}
                          className="h-9 w-40"
                        >
                          {PHASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                      </div>
                      <Textarea
                        placeholder="Notes…"
                        defaultValue={progress.notes ?? ''}
                        onBlur={(e) => {
                          if (e.target.value !== (progress.notes ?? '')) updatePhase(phase.id, { notes: e.target.value || null })
                        }}
                        className="mt-3 min-h-16"
                      />
                    </div>
                  )
                })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
