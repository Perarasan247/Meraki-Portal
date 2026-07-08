import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, BookOpen, CheckCircle2, FileEdit, Layers, GripVertical, Trash2, Clock, ChevronDown, Wrench } from 'lucide-react'
import { api, downloadExport } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton, TableSkeleton, StatCardSkeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Curriculum, CurriculumPhase } from '@/lib/types'

function useCurricula() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['curricula', branchParam],
    queryFn: () => api.get<Curriculum[]>(`/curricula${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function CurriculumPage() {
  const [view, setView] = React.useState<'dashboard' | 'list'>('dashboard')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Curriculum | null>(null)
  const { data: curricula, isLoading } = useCurricula()
  const queryClient = useQueryClient()

  const stats = React.useMemo(() => {
    const list = curricula ?? []
    return {
      total: list.length,
      published: list.filter((c) => c.status === 'Published').length,
      drafts: list.filter((c) => c.status === 'Draft').length,
      totalPhases: list.reduce((sum, c) => sum + c.phases.length, 0),
    }
  }, [curricula])

  const byProgram = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const c of curricula ?? []) map.set(c.program, (map.get(c.program) ?? 0) + 1)
    return Array.from(map.entries())
  }, [curricula])

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      api.patch(`/curricula/${id}/${publish ? 'publish' : 'unpublish'}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Could not update status'),
  })

  async function handleExport() {
    try {
      await downloadExport('/curricula/export', 'curricula.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }

  function openEdit(curriculum: Curriculum) {
    setEditing(curriculum)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum"
        subtitle="Programs, syllabi & learning phases"
        icon={BookOpen}
        actions={
          <>
            <div className="flex rounded-lg border border-(--color-border) p-1">
              {(['dashboard', 'list'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                    view === v ? 'bg-(--color-primary) text-(--color-primary-foreground)' : 'text-(--color-muted-foreground) hover:bg-(--color-muted)',
                  )}
                >
                  {v === 'dashboard' ? 'Dashboard' : 'Outline'}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New Curriculum
            </Button>
          </>
        }
      />

      {view === 'dashboard' ? (
        <CurriculumDashboard isLoading={isLoading} stats={stats} byProgram={byProgram} onViewAll={() => setView('list')} />
      ) : (
        <CurriculumListView
          curricula={curricula ?? []}
          isLoading={isLoading}
          onEdit={openEdit}
          onTogglePublish={(c) => publishMutation.mutate({ id: c.id, publish: c.status !== 'Published' })}
          publishPending={publishMutation.isPending}
        />
      )}

      <CurriculumFormDialog open={formOpen} onClose={closeForm} curriculum={editing} />
    </div>
  )
}

function CurriculumDashboard({
  isLoading, stats, byProgram, onViewAll,
}: {
  isLoading: boolean
  stats: { total: number; published: number; drafts: number; totalPhases: number }
  byProgram: [string, number][]
  onViewAll: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Curricula" value={stats.total} icon={BookOpen} accent="primary" />
            <StatCard label="Published" value={stats.published} icon={CheckCircle2} accent="accent" />
            <StatCard label="Drafts" value={stats.drafts} icon={FileEdit} accent="warning" />
            <StatCard label="Total Phases" value={stats.totalPhases} icon={Layers} accent="primary" />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>By Program</CardTitle>
          <button onClick={onViewAll} className="cursor-pointer text-sm font-medium text-(--color-primary) hover:underline">
            View All
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : stats.total === 0 ? (
            <EmptyState icon={BookOpen} title="No curricula yet" description="Click New Curriculum to get started." />
          ) : byProgram.length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {byProgram.map(([program, count]) => (
                <div key={program} className="rounded-lg border border-(--color-border) p-3">
                  <p className="text-xs text-(--color-muted-foreground)">{program}</p>
                  <p className="font-display text-lg font-bold">{count}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PhaseTimeline({ phases }: { phases: CurriculumPhase[] }) {
  if (phases.length === 0) {
    return (
      <p className="pl-1 text-sm text-(--color-muted-foreground)">No phases defined yet. Edit this curriculum to build its syllabus.</p>
    )
  }
  const ordered = [...phases].sort((a, b) => a.order - b.order)
  return (
    <ol className="relative space-y-5">
      {ordered.map((phase, i) => (
        <li key={phase.id} className="relative flex gap-4">
          {/* connector line */}
          {i < ordered.length - 1 && (
            <span aria-hidden className="absolute left-4 top-9 bottom-[-1.75rem] w-px bg-(--color-border)" />
          )}
          {/* node */}
          <div className="relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold tabular-nums text-indigo-700 ring-4 ring-(--color-card) dark:bg-indigo-500/15 dark:text-indigo-300">
            {phase.order}
          </div>
          <div className="flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-(--color-foreground)">{phase.title || 'Untitled phase'}</p>
              {phase.estimated_duration && (
                <span className="inline-flex items-center gap-1 text-xs text-(--color-muted-foreground)">
                  <Clock className="h-3.5 w-3.5" /> {phase.estimated_duration}
                </span>
              )}
            </div>
            {phase.description && (
              <p className="mt-1 text-sm text-(--color-muted-foreground)">{phase.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function CurriculumOutlineCard({
  curriculum, expanded, onToggle, onEdit, onTogglePublish, publishPending,
}: {
  curriculum: Curriculum
  expanded: boolean
  onToggle: () => void
  onEdit: (c: Curriculum) => void
  onTogglePublish: (c: Curriculum) => void
  publishPending: boolean
}) {
  const navigate = useNavigate()
  return (
    <Card>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className="flex cursor-pointer flex-wrap items-start justify-between gap-3 p-5"
      >
        <div className="flex items-start gap-3">
          <ChevronDown
            className={cn('mt-1 h-4 w-4 flex-none text-(--color-muted-foreground) transition-transform', expanded ? 'rotate-0' : '-rotate-90')}
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-(--color-primary)">{curriculum.program}</p>
            <h3 className="font-display text-lg font-bold leading-tight text-(--color-foreground)">{curriculum.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={curriculum.status} />
              <Badge variant="default" className="tabular-nums">
                <Layers className="h-3 w-3" /> {curriculum.phases.length} {curriculum.phases.length === 1 ? 'phase' : 'phases'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => navigate(`/app/curriculum/${curriculum.id}`)}>
            <Wrench className="h-3.5 w-3.5" /> Build Content
          </Button>
          <Button size="sm" variant="outline" onClick={() => onEdit(curriculum)}>Edit</Button>
          <Button
            size="sm"
            variant={curriculum.status === 'Published' ? 'ghost' : 'accent'}
            loading={publishPending}
            onClick={() => onTogglePublish(curriculum)}
          >
            {curriculum.status === 'Published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>
      {expanded && (
        <CardContent className="border-t border-(--color-border) pt-5">
          <PhaseTimeline phases={curriculum.phases} />
        </CardContent>
      )}
    </Card>
  )
}

function CurriculumListView({
  curricula, isLoading, onEdit, onTogglePublish, publishPending,
}: {
  curricula: Curriculum[]
  isLoading: boolean
  onEdit: (c: Curriculum) => void
  onTogglePublish: (c: Curriculum) => void
  publishPending: boolean
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-2 h-4 w-24" />
          </Card>
        ))}
      </div>
    )
  }

  if (curricula.length === 0) {
    return (
      <Card>
        <CardContent className="py-4">
          <EmptyState icon={BookOpen} title="No curricula yet" description="Click New Curriculum to get started." />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {curricula.map((c) => (
        <CurriculumOutlineCard
          key={c.id}
          curriculum={c}
          expanded={expandedId === c.id}
          onToggle={() => setExpandedId((prev) => (prev === c.id ? null : c.id))}
          onEdit={onEdit}
          onTogglePublish={onTogglePublish}
          publishPending={publishPending}
        />
      ))}
    </div>
  )
}

type PhaseFormState = CurriculumPhase

function emptyPhase(order: number): PhaseFormState {
  return { id: crypto.randomUUID(), title: '', description: '', order, estimated_duration: '' }
}

function CurriculumFormDialog({
  open, onClose, curriculum,
}: {
  open: boolean
  onClose: () => void
  curriculum: Curriculum | null
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = React.useState('')
  const [program, setProgram] = React.useState('')
  const [phases, setPhases] = React.useState<PhaseFormState[]>([])
  const dragIndex = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!open) return
    if (curriculum) {
      setTitle(curriculum.title)
      setProgram(curriculum.program)
      setPhases(curriculum.phases.map((p) => ({ ...p })))
    } else {
      setTitle('')
      setProgram('')
      setPhases([])
    }
  }, [open, curriculum])

  const createMutation = useMutation({
    mutationFn: () => api.post('/curricula', { title, program, phases }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Curriculum created')
      onClose()
    },
    onError: () => toast.error('Could not create curriculum'),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/curricula/${curriculum!.id}`, { title, program, phases }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Curriculum updated')
      onClose()
    },
    onError: () => toast.error('Could not update curriculum'),
  })

  const saving = createMutation.isPending || updateMutation.isPending

  function addPhase() {
    const nextOrder = phases.length > 0 ? Math.max(...phases.map((p) => p.order)) + 1 : 1
    setPhases([...phases, emptyPhase(nextOrder)])
  }

  function updatePhase(index: number, patch: Partial<PhaseFormState>) {
    setPhases(phases.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  function removePhase(index: number) {
    setPhases(phases.filter((_, i) => i !== index))
  }

  function handleDrop(targetIndex: number) {
    const sourceIndex = dragIndex.current
    if (sourceIndex === null || sourceIndex === targetIndex) return
    const next = [...phases]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    setPhases(next.map((p, i) => ({ ...p, order: i + 1 })))
    dragIndex.current = null
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={curriculum ? 'Edit Curriculum' : 'New Curriculum'}
      description="Define the program and its phases."
      className="max-w-2xl"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (curriculum) {
            updateMutation.mutate()
          } else {
            createMutation.mutate()
          }
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="program">Program *</Label>
            <Input id="program" required value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. Robotics" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="mb-0">Phases</Label>
            <Button type="button" size="sm" variant="outline" onClick={addPhase}>
              <Plus className="h-3.5 w-3.5" /> Add Phase
            </Button>
          </div>
          {phases.length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">No phases yet. Add one to get started.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {phases.map((phase, index) => (
                <div
                  key={phase.id}
                  draggable
                  onDragStart={() => { dragIndex.current = index }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  className="flex gap-2 rounded-lg border border-(--color-border) p-3"
                >
                  <div className="flex cursor-grab items-start pt-2 text-(--color-muted-foreground) active:cursor-grabbing">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Phase title"
                        value={phase.title}
                        onChange={(e) => updatePhase(index, { title: e.target.value })}
                      />
                      <Input
                        placeholder="Estimated duration (e.g. 2 weeks)"
                        value={phase.estimated_duration ?? ''}
                        onChange={(e) => updatePhase(index, { estimated_duration: e.target.value })}
                      />
                    </div>
                    <Textarea
                      placeholder="Phase description"
                      value={phase.description ?? ''}
                      onChange={(e) => updatePhase(index, { description: e.target.value })}
                      className="min-h-14"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhase(index)}
                    aria-label="Remove phase"
                    className="cursor-pointer self-start rounded-md p-1.5 text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-destructive)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{curriculum ? 'Save Changes' : 'Create Curriculum'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
