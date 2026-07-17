import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, BookOpen, CheckCircle2, FileEdit, GraduationCap, Wrench, ArrowRight, Sparkles, Trash2,
  AlertTriangle, ChevronDown, X, Pencil,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { useDebounced } from '@/hooks/useDebounced'
import { useProgramOptions } from '@/hooks/usePrograms'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ui/confirm'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  SortableHead, type SortState,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ViewCurriculumDialog } from './ViewCurriculumDialog'
import { sdlcPhases } from '@/lib/sdlc'
import { cn, formatDate } from '@/lib/utils'
import { courseAccent, coverStyle } from '@/student/courseTheme'
import type { Curriculum, CurriculumScope, Domain, Branch, Page } from '@/lib/types'

const SCOPES: CurriculumScope[] = ['Training', 'Internship', 'Project']
const STATUSES = ['Draft', 'Published']
const DEFAULT_PAGE_SIZE = 5

function useCurricula() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['curricula', branchParam],
    queryFn: () => api.get<Curriculum[]>(`/curricula${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function CurriculumPage() {
  const [view, setView] = React.useState<'cards' | 'list'>('cards')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Curriculum | null>(null)
  // The type is chosen up front via New ▾, and fixed for that create.
  const [newScope, setNewScope] = React.useState<CurriculumScope>('Internship')
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

  function openNew(scope: CurriculumScope) { setEditing(null); setNewScope(scope); setFormOpen(true) }
  function openEdit(c: Curriculum) { setEditing(c); setFormOpen(true) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum"
        subtitle="Build and publish training, internship & project curricula"
        icon={BookOpen}
        actions={<NewCurriculumMenu onPick={openNew} />}
      />

      {/* Stats + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-3 gap-3">
          <StatChip icon={BookOpen} label="Curricula" value={stats.total} tone="text-(--color-primary)" />
          <StatChip icon={CheckCircle2} label="Published" value={stats.published} tone="text-emerald-500" />
          <StatChip icon={FileEdit} label="Drafts" value={stats.drafts} tone="text-amber-500" />
        </div>
        <div className="flex rounded-lg border border-(--color-border) p-1">
          {(['cards', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                view === v
                  ? 'bg-(--color-primary) text-(--color-primary-foreground)'
                  : 'text-(--color-muted-foreground) hover:bg-(--color-muted)',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'cards' ? (
        isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-(--radius-card)" />)}
          </div>
        ) : list.length === 0 ? (
          <Card className="p-2">
            <EmptyState
              icon={GraduationCap}
              title="No curricula yet"
              description="Create your first one, then add sections, lessons and quizzes."
              actionLabel="New Internship"
              onAction={() => openNew('Internship')}
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
        )
      ) : (
        <CurriculumListView onEdit={openEdit} />
      )}

      <CurriculumFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        curriculum={editing}
        scope={editing?.scope ?? newScope}
      />
    </div>
  )
}

/** One New button; the type is picked from its menu and fixed for that create. */
function NewCurriculumMenu({ onPick }: { onPick: (scope: CurriculumScope) => void }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Clicking anywhere outside closes it — same as every other popup here.
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Plus className="h-4 w-4" /> New Curriculum
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-card) p-1 shadow-(--shadow-card-hover)"
        >
          {SCOPES.map((s) => (
            <button
              key={s}
              role="menuitem"
              onClick={() => { setOpen(false); onPick(s) }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-(--color-muted)"
            >
              <Plus className="h-3.5 w-3.5 text-(--color-muted-foreground)" />
              New {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Table view: search, sort and paginate on the server, so it stays correct as
 * the curriculum count grows rather than filtering whatever happened to load.
 */
function CurriculumListView({ onEdit }: { onEdit: (c: Curriculum) => void }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const branchParam = useBranchQueryParam()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState('')
  const [scopeFilter, setScopeFilter] = React.useState('')
  const [programFilter, setProgramFilter] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE)
  const [sort, setSort] = React.useState<SortState>({ by: 'created_at', dir: 'desc' })
  const [viewing, setViewing] = React.useState<Curriculum | null>(null)
  const debouncedSearch = useDebounced(search.trim(), 300)
  const programs = useProgramOptions()
  const hasFilters = !!(search || scopeFilter || programFilter || statusFilter)
  // Any change to what's being listed sends you back to page 1.
  React.useEffect(() => setPage(1), [debouncedSearch, scopeFilter, programFilter, statusFilter, pageSize, sort])

  // One builder for both the query and the prefetch, so they can't drift apart.
  const listKey = React.useCallback(
    (p: number) => ['curricula', branchParam, 'list', p, pageSize, debouncedSearch, scopeFilter, programFilter, statusFilter, sort.by, sort.dir],
    [branchParam, pageSize, debouncedSearch, scopeFilter, programFilter, statusFilter, sort],
  )
  const fetchPage = React.useCallback(
    (p: number) => {
      const qs = new URLSearchParams(branchParam)
      qs.set('page', String(p))
      qs.set('page_size', String(pageSize))
      qs.set('sort_by', sort.by)
      qs.set('sort_dir', sort.dir)
      if (debouncedSearch) qs.set('search', debouncedSearch)
      if (scopeFilter) qs.set('scope_filter', scopeFilter)
      if (programFilter) qs.set('program', programFilter)
      if (statusFilter) qs.set('status_filter', statusFilter)
      return api.get<Page<Curriculum>>(`/curricula?${qs.toString()}`)
    },
    [branchParam, pageSize, sort, debouncedSearch, scopeFilter, programFilter, statusFilter],
  )

  const { data, isLoading } = useQuery({
    queryKey: listKey(page),
    queryFn: () => fetchPage(page),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const total = data?.total ?? 0

  React.useEffect(() => {
    if (page * pageSize >= total) return
    queryClient.prefetchQuery({ queryKey: listKey(page + 1), queryFn: () => fetchPage(page + 1) })
  }, [page, pageSize, total, queryClient, listKey, fetchPage])

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      api.delete(`/curricula/${id}${force ? '?force=true' : ''}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Curriculum deleted')
    },
    onError: () => toast.error('Could not delete curriculum'),
  })

  async function handleDelete(c: Curriculum) {
    const ok = await confirm({
      title: `Delete “${c.title}”?`,
      description: 'This also deletes all its sections, lessons, content and quizzes. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await deleteMutation.mutateAsync({ id: c.id, force: false })
    } catch (err) {
      // 409 = a batch still tracks this curriculum.
      if (err instanceof ApiError && err.status === 409) {
        const force = await confirm({
          title: 'This curriculum is in use',
          description: (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-(--color-foreground) dark:border-amber-500/40 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{err.message} Delete it anyway?</span>
            </div>
          ),
          confirmLabel: 'Delete anyway',
          tone: 'danger',
        })
        if (force) deleteMutation.mutate({ id: c.id, force: true })
      }
    }
  }

  return (
    <>
      <Card>
        {/* Title and toolbar stack, so both sit flush with the table's left edge. */}
        <CardHeader className="gap-3">
          <CardTitle>All Curricula</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search title, program…" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-56 flex-1" />
            <Select aria-label="Filter by type" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="w-auto max-w-44">
              <option value="">All types</option>
              {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select aria-label="Filter by program" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="w-auto max-w-44">
              <option value="">All programs</option>
              {programs.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto max-w-44">
              <option value="">All status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setScopeFilter(''); setProgramFilter(''); setStatusFilter('') }}
              >
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : items.length === 0 ? (
            <EmptyState icon={BookOpen} title="No curricula found" description="Try adjusting your search or filters." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Title" column="title" sort={sort} onSort={setSort} />
                    <TableHead>Type</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-right">Phases</TableHead>
                    <TableHead>Status</TableHead>
                    <SortableHead label="Created" column="created_at" sort={sort} onSort={setSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.id} onClick={() => setViewing(c)} className="cursor-pointer">
                      <TableCell>
                        <span className="block max-w-[14rem] truncate font-medium text-(--color-foreground)" title={c.title}>
                          {c.title}
                        </span>
                      </TableCell>
                      <TableCell><Badge variant="default">{c.scope}</Badge></TableCell>
                      <TableCell>
                        <span className="block max-w-[10rem] truncate" title={c.program}>
                          {c.program || <span className="text-(--color-muted-foreground)">—</span>}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.phases?.length ?? 0}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="tabular-nums">{formatDate(c.created_at)}</TableCell>
                      {/* Actions must not trigger the row's View. */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" title="Build content" aria-label={`Build ${c.title}`} onClick={() => navigate(`/app/curriculum/${c.id}`)}>
                            <Wrench className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" title="Edit" aria-label={`Edit ${c.title}`} onClick={() => onEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete"
                            aria-label={`Delete ${c.title}`}
                            className="text-(--color-destructive) hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSizeChange={setPageSize} />
        </CardContent>
      </Card>

      <ViewCurriculumDialog
        curriculum={viewing}
        onClose={() => setViewing(null)}
        onEdit={(c) => { setViewing(null); onEdit(c) }}
        onBuild={(c) => { setViewing(null); navigate(`/app/curriculum/${c.id}`) }}
      />
    </>
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
        <span className="absolute right-3 top-3 flex items-center gap-1.5">
          <span className="inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
            {curriculum.scope}
          </span>
          <StatusBadge status={curriculum.status} />
        </span>
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
  open, onClose, curriculum, scope,
}: {
  open: boolean
  onClose: () => void
  curriculum: Curriculum | null
  /** Chosen from the New ▾ menu on create; the existing type when editing. */
  scope: CurriculumScope
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
    mutationFn: () => api.post<Curriculum>('/curricula', {
      title,
      program: derivedProgram(),
      scope,
      branch_id: branchId || undefined,
      domain_id: domainId || null,
      // A project starts from the standard SDLC stages; everything else starts empty.
      phases: scope === 'Project' ? sdlcPhases() : [],
    }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success(`${scope} created — now add your content`)
      onClose()
      navigate(`/app/curriculum/${created.id}`)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : `Could not create ${scope.toLowerCase()}`),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/curricula/${curriculum!.id}`, { title, program: derivedProgram(), domain_id: domainId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Curriculum updated')
      onClose()
    },
    onError: () => toast.error('Could not update curriculum'),
  })

  const deleteMutation = useMutation({
    mutationFn: (force: boolean) =>
      api.delete(`/curricula/${curriculum!.id}${force ? '?force=true' : ''}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] })
      toast.success('Curriculum deleted')
      onClose()
    },
    onError: async (err) => {
      // 409 = a batch still tracks this internship. Surface exactly what will be
      // lost and let the user push it through rather than dead-ending.
      if (err instanceof ApiError && err.status === 409) {
        const ok = await confirm({
          title: 'This curriculum is in use',
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
      toast.error(err instanceof ApiError ? err.message : 'Could not delete curriculum')
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
      title={curriculum ? `Edit ${scope}` : `New ${scope}`}
      description={
        curriculum
          ? `Update the ${scope.toLowerCase()} details.`
          : scope === 'Project'
            ? 'Name it and pick a domain — it starts with the standard SDLC phases.'
            : 'Name it and pick a domain — you’ll add sections & lessons next.'
      }
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
          <Button type="submit" form="curriculum-form" loading={saving}>
            {curriculum ? 'Save changes' : <>Create &amp; build <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </>
      }
    >
      <form
        id="curriculum-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (curriculum) updateMutation.mutate()
          else createMutation.mutate()
        }}
      >
        <div>
          <Label htmlFor="title">{scope} title *</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Foundations of Generative AI" />
        </div>

        {/* Branch — super admin chooses which branch this is for.
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
            The program is set from the domain. Students in this domain see it once it’s published.
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
