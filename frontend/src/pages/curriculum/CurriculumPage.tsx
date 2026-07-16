import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, BookOpen, CheckCircle2, FileEdit, GraduationCap, Wrench, ArrowRight, Sparkles, Trash2,
  AlertTriangle,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ui/confirm'
import { cn } from '@/lib/utils'
import { courseAccent, coverStyle } from '@/student/courseTheme'
import type { Curriculum, Domain, Branch } from '@/lib/types'

function useCurricula() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['curricula', branchParam],
    queryFn: () => api.get<Curriculum[]>(`/curricula${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function CurriculumPage() {
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Curriculum | null>(null)
  const { data: curricula, isLoading } = useCurricula()
  const queryClient = useQueryClient()

  const list = curricula ?? []
  const stats = {
    total: list.length,
    published: list.filter((c) => c.status === 'Published').length,
    drafts: list.filter((c) => c.status === 'Draft').length,
  }

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      api.patch(`/curricula/${id}/${publish ? 'publish' : 'unpublish'}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Could not update status'),
  })

  function openNew() { setEditing(null); setFormOpen(true) }
  function openEdit(c: Curriculum) { setEditing(c); setFormOpen(true) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internships"
        subtitle="Build and publish your internship courses"
        icon={BookOpen}
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New Internship
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatChip icon={BookOpen} label="Internships" value={stats.total} tone="text-(--color-primary)" />
        <StatChip icon={CheckCircle2} label="Published" value={stats.published} tone="text-emerald-500" />
        <StatChip icon={FileEdit} label="Drafts" value={stats.drafts} tone="text-amber-500" />
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-(--radius-card)" />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={GraduationCap}
            title="No internships yet"
            description="Create your first internship, then add sections, lessons and quizzes."
            actionLabel="New Internship"
            onAction={openNew}
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <InternshipCard
              key={c.id}
              curriculum={c}
              onEdit={() => openEdit(c)}
              onTogglePublish={() => publishMutation.mutate({ id: c.id, publish: c.status !== 'Published' })}
              publishPending={publishMutation.isPending}
            />
          ))}
        </div>
      )}

      <CurriculumFormDialog open={formOpen} onClose={() => setFormOpen(false)} curriculum={editing} />
    </div>
  )
}

function StatChip({ icon: Icon, label, value, tone }: { icon: typeof BookOpen; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-4 shadow-(--shadow-card)">
      <Icon className={cn('h-5 w-5', tone)} />
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-(--color-muted-foreground)">{label}</p>
    </div>
  )
}

function InternshipCard({
  curriculum, onEdit, onTogglePublish, publishPending,
}: {
  curriculum: Curriculum
  onEdit: () => void
  onTogglePublish: () => void
  publishPending: boolean
}) {
  const navigate = useNavigate()
  const accent = courseAccent(curriculum.id)
  const build = () => navigate(`/app/curriculum/${curriculum.id}`)
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      {/* Cover — clicking opens the builder */}
      <button onClick={build} className="relative block h-24 cursor-pointer overflow-hidden p-4 text-left text-white" style={coverStyle(accent)}>
        <BookOpen className="pointer-events-none absolute -bottom-5 -right-3 h-24 w-24 opacity-15" strokeWidth={1} />
        <span className="inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
          {curriculum.program || 'Program'}
        </span>
        <span className="absolute right-3 top-3"><StatusBadge status={curriculum.status} /></span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display font-semibold leading-snug line-clamp-2">{curriculum.title}</h3>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-(--color-muted-foreground)">
          <GraduationCap className="h-3.5 w-3.5" />
          {curriculum.domain_id ? curriculum.program : 'Not assigned to a domain'}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <Button size="sm" className="flex-1" onClick={build}>
            <Wrench className="h-3.5 w-3.5" /> Build content
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
          <Button
            size="sm"
            variant={curriculum.status === 'Published' ? 'ghost' : 'accent'}
            loading={publishPending}
            onClick={onTogglePublish}
          >
            {curriculum.status === 'Published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function CurriculumFormDialog({
  open, onClose, curriculum,
}: {
  open: boolean
  onClose: () => void
  curriculum: Curriculum | null
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin'
  const [title, setTitle] = React.useState('')
  const [branchId, setBranchId] = React.useState('')
  const [domainId, setDomainId] = React.useState('')
  const [addingDomain, setAddingDomain] = React.useState(false)
  const [newDomainLabel, setNewDomainLabel] = React.useState('')

  const { data: domains } = useQuery({
    queryKey: ['domains', 'all'],
    queryFn: () => api.get<Domain[]>('/domains'),
    enabled: open,
  })
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  React.useEffect(() => {
    if (!open) return
    setTitle(curriculum?.title ?? '')
    setDomainId(curriculum?.domain_id ?? '')
    // Super admin picks the branch; on edit it's fixed to the internship's branch.
    setBranchId(curriculum?.branch_id ?? (isSuperAdmin ? (branches?.[0]?.id ?? '') : ''))
    setAddingDomain(false)
    setNewDomainLabel('')
  }, [open, curriculum, isSuperAdmin, branches])

  // Domains a super admin sees are branch-scoped so the list has no duplicates;
  // branch users already only receive their own branch's domains.
  const visibleDomains = React.useMemo(
    () => (isSuperAdmin && branchId ? (domains ?? []).filter((d) => d.branch_id === branchId) : (domains ?? [])),
    [domains, isSuperAdmin, branchId],
  )

  // The program is the label of the chosen domain — no separate field.
  const derivedProgram = () => domains?.find((d) => d.id === domainId)?.label ?? ''

  const createMutation = useMutation({
    mutationFn: () => api.post<Curriculum>('/curricula', { title, program: derivedProgram(), branch_id: branchId || undefined, domain_id: domainId || null, phases: [] }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Internship created — now add your content')
      onClose()
      navigate(`/app/curriculum/${created.id}`)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not create internship'),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/curricula/${curriculum!.id}`, { title, program: derivedProgram(), domain_id: domainId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Internship updated')
      onClose()
    },
    onError: () => toast.error('Could not update internship'),
  })

  const deleteMutation = useMutation({
    mutationFn: (force: boolean) =>
      api.delete(`/curricula/${curriculum!.id}${force ? '?force=true' : ''}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Internship deleted')
      onClose()
    },
    onError: async (err) => {
      // 409 = a batch still tracks this internship. Surface exactly what will be
      // lost and let the user push it through rather than dead-ending.
      if (err instanceof ApiError && err.status === 409) {
        const ok = await confirm({
          title: 'This internship is in use',
          description: (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-(--color-foreground) dark:border-amber-500/40 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{err.message} Delete it anyway?</span>
            </div>
          ),
          confirmLabel: 'Delete anyway',
          tone: 'danger',
        })
        if (ok) deleteMutation.mutate(true)
        return
      }
      toast.error(err instanceof ApiError ? err.message : 'Could not delete internship')
    },
  })

  const createDomain = useMutation({
    mutationFn: (label: string) => api.post<Domain>('/domains', {
      branch_id: branchId || branches?.[0]?.id,
      key: label.toLowerCase().replace(/\s+/g, '-'),
      label,
    }),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['domains', 'all'] })
      setDomainId(d.id)
      setAddingDomain(false)
      setNewDomainLabel('')
      toast.success('Domain added')
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add domain'),
  })

  function addDomain() {
    const label = newDomainLabel.trim()
    if (label) createDomain.mutate(label)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={curriculum ? 'Edit Internship' : 'New Internship'}
      description={curriculum ? 'Update the internship details.' : 'Name it and pick a domain — you’ll add sections & lessons next.'}
      footer={
        <>
          {curriculum ? (
            /* Destructive action kept away from Save. */
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-(--color-destructive) hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)"
              loading={deleteMutation.isPending}
              onClick={async () => {
                if (await confirm({
                  title: `Delete “${curriculum.title}”?`,
                  description: 'This also deletes all its sections, lessons, content and quizzes. This cannot be undone.',
                  confirmLabel: 'Delete',
                  tone: 'danger',
                })) deleteMutation.mutate(false)
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTitle('')
                setDomainId('')
                setBranchId(isSuperAdmin ? (branches?.[0]?.id ?? '') : '')
                setAddingDomain(false)
                setNewDomainLabel('')
              }}
            >
              Clear
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="internship-form" loading={saving}>
            {curriculum ? 'Save changes' : <>Create &amp; build <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </>
      }
    >
      <form
        id="internship-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (curriculum) updateMutation.mutate()
          else createMutation.mutate()
        }}
      >
        <div>
          <Label htmlFor="title">Internship title *</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Foundations of Generative AI" />
        </div>

        {/* Branch — super admin chooses which branch this internship is for.
            Fixed once created (content is scoped to its branch). */}
        {isSuperAdmin && (
          <div>
            <Label htmlFor="c_branch">Branch *</Label>
            <Select
              id="c_branch"
              value={branchId}
              disabled={!!curriculum}
              onChange={(e) => {
                const next = e.target.value
                setBranchId(next)
                // Drop a domain selection that doesn't belong to the new branch.
                if (domainId && !(domains ?? []).some((d) => d.id === domainId && d.branch_id === next)) {
                  setDomainId('')
                }
              }}
            >
              {(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="domain" className="mb-0">Internship domain</Label>
            {!addingDomain && (
              <button
                type="button"
                onClick={() => setAddingDomain(true)}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-(--color-primary) hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> New domain
              </button>
            )}
          </div>
          {addingDomain ? (
            <div className="flex items-end gap-2">
              <Input
                autoFocus
                value={newDomainLabel}
                placeholder="e.g. Cyber Security"
                onChange={(e) => setNewDomainLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain() } }}
              />
              <Button type="button" loading={createDomain.isPending} onClick={addDomain}>Add</Button>
              <Button type="button" variant="ghost" onClick={() => { setAddingDomain(false); setNewDomainLabel('') }}>Cancel</Button>
            </div>
          ) : (
            <Select id="domain" value={domainId} onChange={(e) => setDomainId(e.target.value)}>
              <option value="">Unassigned (hidden from students)</option>
              {visibleDomains.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </Select>
          )}
          <p className="mt-1 text-xs text-(--color-muted-foreground)">
            The program is set from the domain. Students in this domain see the internship once it’s published.
          </p>
        </div>

        {!curriculum && (
          <div className="flex items-start gap-2 rounded-lg bg-(--color-sidebar-active) p-3 text-xs text-(--color-muted-foreground)">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-(--color-primary)" />
            <span>After creating, you’ll go straight to the builder to add sections, lessons, content and quizzes.</span>
          </div>
        )}

      </form>
    </Dialog>
  )
}
