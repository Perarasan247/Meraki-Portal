import * as React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Wrench, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Pencil, Eye, EyeOff,
  FileText, Video, Image as ImageIcon, HelpCircle, Clock, ListChecks, Save, ArrowLeft,
  CircleCheck, X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type {
  CurriculumContent, ModuleTree, LessonTree, LessonBlock, Quiz, QuizQuestion, QuizOption,
  LessonBlockType, QuizQuestionType,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Context + helpers
// ---------------------------------------------------------------------------

interface BuilderCtxValue {
  cid: string
  invalidate: () => void
}
const BuilderCtx = React.createContext<BuilderCtxValue | null>(null)

function useBuilder(): BuilderCtxValue {
  const ctx = React.useContext(BuilderCtx)
  if (!ctx) throw new Error('useBuilder must be used within BuilderCtx')
  return ctx
}

function useAction<V = void>(
  mutationFn: (vars: V) => Promise<unknown>,
  opts?: { success?: string; error?: string },
) {
  const { invalidate } = useBuilder()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidate()
      if (opts?.success) toast.success(opts.success)
    },
    onError: () => toast.error(opts?.error ?? 'Something went wrong'),
  })
}

function moveIds<T extends { id: string }>(items: T[], index: number, dir: -1 | 1): string[] {
  const ids = items.map((i) => i.id)
  const j = index + dir
  if (j < 0 || j >= ids.length) return ids
  const tmp = ids[index]
  ids[index] = ids[j]
  ids[j] = tmp
  return ids
}

function parseYouTubeId(url: string): string {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return ''
}

const QUESTION_TYPE_LABEL: Record<QuizQuestionType, string> = {
  single_choice: 'Single choice',
  multi_choice: 'Multiple choice',
  true_false: 'True / False',
  short_answer: 'Short answer',
}

const BLOCK_TYPE_META: Record<LessonBlockType, { label: string; icon: typeof FileText }> = {
  text: { label: 'Text', icon: FileText },
  video: { label: 'Video', icon: Video },
  image: { label: 'Image', icon: ImageIcon },
}

// ---------------------------------------------------------------------------
// Small shared UI bits
// ---------------------------------------------------------------------------

function ReorderControls({
  onUp, onDown, disableUp, disableDown,
}: {
  onUp: () => void
  onDown: () => void
  disableUp: boolean
  disableDown: boolean
}) {
  return (
    <div className="flex flex-none flex-col">
      <button
        type="button"
        aria-label="Move up"
        disabled={disableUp}
        onClick={onUp}
        className="cursor-pointer rounded p-0.5 text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground) disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={disableDown}
        onClick={onDown}
        className="cursor-pointer rounded p-0.5 text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground) disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  )
}

function IconDelete({ label, onClick, pending }: { label: string; onClick: () => void; pending?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onClick={onClick}
      className="cursor-pointer rounded-md p-1.5 text-(--color-muted-foreground) hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

function PublishBadge({ published }: { published: boolean }) {
  return published ? (
    <Badge variant="success">Published</Badge>
  ) : (
    <Badge variant="default">Draft</Badge>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CurriculumBuilderPage() {
  const { curriculumId } = useParams<{ curriculumId: string }>()
  const cid = curriculumId ?? ''
  const queryClient = useQueryClient()

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['lms-content', cid] })
  }, [queryClient, cid])

  const ctxValue = React.useMemo<BuilderCtxValue>(() => ({ cid, invalidate }), [cid, invalidate])

  const { data, isLoading } = useQuery({
    queryKey: ['lms-content', cid],
    queryFn: () => api.get<CurriculumContent>(`/lms/curricula/${cid}/content`),
    enabled: !!cid,
  })

  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null)
  const [addModuleOpen, setAddModuleOpen] = React.useState(false)

  const modules = React.useMemo(
    () => [...(data?.modules ?? [])].sort((a, b) => a.order_index - b.order_index),
    [data],
  )

  // keep a valid selection
  React.useEffect(() => {
    if (modules.length === 0) {
      setSelectedModuleId(null)
      return
    }
    if (!selectedModuleId || !modules.some((m) => m.id === selectedModuleId)) {
      setSelectedModuleId(modules[0].id)
    }
  }, [modules, selectedModuleId])

  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? null

  return (
    <BuilderCtx.Provider value={ctxValue}>
      <div className="space-y-6">
        <Link
          to="/app/curriculum"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-muted-foreground) hover:text-(--color-foreground)"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Curriculum
        </Link>

        <PageHeader
          title="Course Builder"
          subtitle="Modules, lessons, content & quizzes"
          icon={Wrench}
          actions={
            <Button onClick={() => setAddModuleOpen(true)}>
              <Plus className="h-4 w-4" /> Add Module
            </Button>
          }
        />

        {isLoading ? (
          <BuilderSkeleton />
        ) : modules.length === 0 ? (
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={ListChecks}
                title="No modules yet"
                description="Start building this course by adding your first module."
                actionLabel="Add Module"
                onAction={() => setAddModuleOpen(true)}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
            <ModuleList
              modules={modules}
              selectedId={selectedModuleId}
              onSelect={setSelectedModuleId}
            />
            {selectedModule ? (
              <ModulePanel key={selectedModule.id} module={selectedModule} />
            ) : (
              <Card>
                <CardContent className="py-4">
                  <EmptyState title="Select a module" description="Pick a module from the list to edit it." />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <ModuleFormDialog open={addModuleOpen} onClose={() => setAddModuleOpen(false)} nextOrder={modules.length} />
    </BuilderCtx.Provider>
  )
}

function BuilderSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-3 h-4 w-80" />
        <Skeleton className="mt-6 h-24 w-full" />
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Module list (left pane)
// ---------------------------------------------------------------------------

function ModuleList({
  modules, selectedId, onSelect,
}: {
  modules: ModuleTree[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const { cid } = useBuilder()
  const reorder = useAction(
    (ids: string[]) => api.post(`/lms/curricula/${cid}/modules/reorder`, { ids }),
    { error: 'Could not reorder modules' },
  )

  return (
    <div className="space-y-2">
      {modules.map((m, i) => {
        const active = m.id === selectedId
        return (
          <div
            key={m.id}
            className={cn(
              'flex items-start gap-2 rounded-lg border p-3 transition-colors',
              active
                ? 'border-(--color-primary) bg-(--color-sidebar-active)'
                : 'border-(--color-border) bg-(--color-card) hover:bg-(--color-muted)',
            )}
          >
            <ReorderControls
              onUp={() => reorder.mutate(moveIds(modules, i, -1))}
              onDown={() => reorder.mutate(moveIds(modules, i, 1))}
              disableUp={i === 0}
              disableDown={i === modules.length - 1}
            />
            <button
              type="button"
              onClick={() => onSelect(m.id)}
              className="min-w-0 flex-1 cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 flex-none items-center justify-center rounded bg-(--color-muted) text-xs font-semibold tabular-nums text-(--color-muted-foreground)">
                  {i + 1}
                </span>
                <p className="truncate font-medium text-(--color-foreground)">{m.title || 'Untitled module'}</p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-7">
                <PublishBadge published={m.is_published} />
                <span className="text-xs text-(--color-muted-foreground)">
                  {m.lessons.length} {m.lessons.length === 1 ? 'lesson' : 'lessons'}
                </span>
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Module panel (right pane)
// ---------------------------------------------------------------------------

function ModulePanel({ module }: { module: ModuleTree }) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [addLessonOpen, setAddLessonOpen] = React.useState(false)

  const publish = useAction(
    (next: boolean) => api.patch(`/lms/modules/${module.id}`, { is_published: next }),
    { success: 'Module updated', error: 'Could not update module' },
  )
  const del = useAction(() => api.delete(`/lms/modules/${module.id}`), {
    success: 'Module deleted',
    error: 'Could not delete module',
  })
  const reorderLessons = useAction(
    (ids: string[]) => api.post(`/lms/modules/${module.id}/lessons/reorder`, { ids }),
    { error: 'Could not reorder lessons' },
  )

  const lessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-lg">{module.title || 'Untitled module'}</CardTitle>
              <PublishBadge published={module.is_published} />
            </div>
            {module.description && (
              <p className="mt-1.5 text-sm text-(--color-muted-foreground)">{module.description}</p>
            )}
          </div>
          <div className="flex flex-none items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant={module.is_published ? 'ghost' : 'accent'}
              loading={publish.isPending}
              onClick={() => publish.mutate(!module.is_published)}
            >
              {module.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {module.is_published ? 'Unpublish' : 'Publish'}
            </Button>
            <IconDelete
              label="Delete module"
              pending={del.isPending}
              onClick={() => {
                if (window.confirm('Delete this module and all its lessons?')) del.mutate()
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Lessons */}
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-(--color-foreground)">Lessons</h4>
            <Button size="sm" variant="outline" onClick={() => setAddLessonOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Lesson
            </Button>
          </div>
          {lessons.length === 0 ? (
            <p className="rounded-lg border border-dashed border-(--color-border) px-4 py-6 text-center text-sm text-(--color-muted-foreground)">
              No lessons yet. Add one to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson, i) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  index={i}
                  count={lessons.length}
                  onMove={(dir) => reorderLessons.mutate(moveIds(lessons, i, dir))}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module quiz */}
      <QuizSection quiz={module.quiz} kind="module" parentId={module.id} />

      <ModuleFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        module={module}
        nextOrder={module.order_index}
      />
      <LessonFormDialog
        open={addLessonOpen}
        onClose={() => setAddLessonOpen(false)}
        moduleId={module.id}
        nextOrder={lessons.length}
      />
    </div>
  )
}

function ModuleFormDialog({
  open, onClose, module, nextOrder,
}: {
  open: boolean
  onClose: () => void
  module?: ModuleTree
  nextOrder: number
}) {
  const { cid } = useBuilder()
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setTitle(module?.title ?? '')
    setDescription(module?.description ?? '')
  }, [open, module])

  const save = useAction(
    () =>
      module
        ? api.patch(`/lms/modules/${module.id}`, { title, description })
        : api.post(`/lms/curricula/${cid}/modules`, { title, description, order_index: nextOrder }),
    {
      success: module ? 'Module updated' : 'Module created',
      error: 'Could not save module',
    },
  )

  return (
    <Dialog open={open} onClose={onClose} title={module ? 'Edit Module' : 'New Module'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate(undefined, { onSuccess: onClose })
        }}
      >
        <div>
          <Label htmlFor="module-title">Title *</Label>
          <Input id="module-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="module-desc">Description</Label>
          <Textarea id="module-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>{module ? 'Save Changes' : 'Create Module'}</Button>
        </div>
      </form>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Lesson row (expandable)
// ---------------------------------------------------------------------------

function LessonRow({
  lesson, index, count, onMove,
}: {
  lesson: LessonTree
  index: number
  count: number
  onMove: (dir: -1 | 1) => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)

  const publish = useAction(
    (next: boolean) => api.patch(`/lms/lessons/${lesson.id}`, { is_published: next }),
    { success: 'Lesson updated', error: 'Could not update lesson' },
  )
  const del = useAction(() => api.delete(`/lms/lessons/${lesson.id}`), {
    success: 'Lesson deleted',
    error: 'Could not delete lesson',
  })

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-card)">
      <div className="flex items-center gap-2 p-2.5">
        <ReorderControls
          onUp={() => onMove(-1)}
          onDown={() => onMove(1)}
          disableUp={index === 0}
          disableDown={index === count - 1}
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <ChevronRight className={cn('h-4 w-4 flex-none text-(--color-muted-foreground) transition-transform', expanded && 'rotate-90')} />
          <span className="truncate font-medium text-(--color-foreground)">{lesson.title || 'Untitled lesson'}</span>
          {!lesson.is_published && <Badge variant="default">Draft</Badge>}
          {lesson.estimated_minutes != null && (
            <span className="inline-flex items-center gap-1 text-xs text-(--color-muted-foreground)">
              <Clock className="h-3 w-3" /> <span className="tabular-nums">{lesson.estimated_minutes}m</span>
            </span>
          )}
        </button>
        <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)} aria-label="Edit lesson">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <IconDelete
          label="Delete lesson"
          pending={del.isPending}
          onClick={() => {
            if (window.confirm('Delete this lesson?')) del.mutate()
          }}
        />
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-(--color-border) p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
              {lesson.is_published ? 'Published' : 'Draft'}
            </span>
            <Button
              size="sm"
              variant={lesson.is_published ? 'ghost' : 'accent'}
              loading={publish.isPending}
              onClick={() => publish.mutate(!lesson.is_published)}
            >
              {lesson.is_published ? 'Unpublish' : 'Publish'}
            </Button>
          </div>

          <BlocksEditor lesson={lesson} />
          <QuizSection quiz={lesson.quiz} kind="lesson" parentId={lesson.id} />
        </div>
      )}

      <LessonFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        moduleId={lesson.module_id}
        lesson={lesson}
        nextOrder={lesson.order_index}
      />
    </div>
  )
}

function LessonFormDialog({
  open, onClose, moduleId, lesson, nextOrder,
}: {
  open: boolean
  onClose: () => void
  moduleId: string
  lesson?: LessonTree
  nextOrder: number
}) {
  const [title, setTitle] = React.useState('')
  const [minutes, setMinutes] = React.useState('')
  const [published, setPublished] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setTitle(lesson?.title ?? '')
    setMinutes(lesson?.estimated_minutes != null ? String(lesson.estimated_minutes) : '')
    setPublished(lesson?.is_published ?? false)
  }, [open, lesson])

  const save = useAction(
    () => {
      const body = {
        title,
        estimated_minutes: minutes === '' ? null : Number(minutes),
        is_published: published,
      }
      return lesson
        ? api.patch(`/lms/lessons/${lesson.id}`, body)
        : api.post(`/lms/modules/${moduleId}/lessons`, { ...body, order_index: nextOrder })
    },
    { success: lesson ? 'Lesson updated' : 'Lesson created', error: 'Could not save lesson' },
  )

  return (
    <Dialog open={open} onClose={onClose} title={lesson ? 'Edit Lesson' : 'New Lesson'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate(undefined, { onSuccess: onClose })
        }}
      >
        <div>
          <Label htmlFor="lesson-title">Title *</Label>
          <Input id="lesson-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="lesson-mins">Estimated minutes</Label>
          <Input
            id="lesson-mins"
            type="number"
            min={0}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="e.g. 30"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-(--color-foreground)">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-indigo-600"
          />
          Published
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>{lesson ? 'Save Changes' : 'Create Lesson'}</Button>
        </div>
      </form>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Blocks editor
// ---------------------------------------------------------------------------

function BlocksEditor({ lesson }: { lesson: LessonTree }) {
  const blocks = [...lesson.blocks].sort((a, b) => a.order_index - b.order_index)
  const addBlock = useAction(
    (type: LessonBlockType) => {
      const content: Record<string, unknown> =
        type === 'text' ? { markdown: '' } : type === 'video' ? { url: '', youtube_id: '', caption: '' } : { url: '', caption: '' }
      return api.post(`/lms/lessons/${lesson.id}/blocks`, { type, order_index: blocks.length, content })
    },
    { success: 'Block added', error: 'Could not add block' },
  )
  const reorder = useAction(
    (ids: string[]) => api.post(`/lms/lessons/${lesson.id}/blocks/reorder`, { ids }),
    { error: 'Could not reorder blocks' },
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">Content Blocks</h5>
        <div className="flex items-center gap-1">
          {(Object.keys(BLOCK_TYPE_META) as LessonBlockType[]).map((t) => {
            const Icon = BLOCK_TYPE_META[t].icon
            return (
              <Button key={t} size="sm" variant="outline" onClick={() => addBlock.mutate(t)}>
                <Icon className="h-3.5 w-3.5" /> {BLOCK_TYPE_META[t].label}
              </Button>
            )
          })}
        </div>
      </div>
      {blocks.length === 0 ? (
        <p className="text-sm text-(--color-muted-foreground)">No content blocks yet.</p>
      ) : (
        <div className="space-y-2">
          {blocks.map((b, i) => (
            <BlockEditor
              key={b.id}
              block={b}
              index={i}
              count={blocks.length}
              onMove={(dir) => reorder.mutate(moveIds(blocks, i, dir))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BlockEditor({
  block, index, count, onMove,
}: {
  block: LessonBlock
  index: number
  count: number
  onMove: (dir: -1 | 1) => void
}) {
  const meta = BLOCK_TYPE_META[block.type]
  const Icon = meta.icon

  const del = useAction(() => api.delete(`/lms/blocks/${block.id}`), {
    success: 'Block deleted',
    error: 'Could not delete block',
  })
  const save = useAction(
    (content: Record<string, unknown>) => api.patch(`/lms/blocks/${block.id}`, { content }),
    { success: 'Block saved', error: 'Could not save block' },
  )

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-muted)/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <ReorderControls
          onUp={() => onMove(-1)}
          onDown={() => onMove(1)}
          disableUp={index === 0}
          disableDown={index === count - 1}
        />
        <Badge variant="primary" className="capitalize">
          <Icon className="h-3 w-3" /> {meta.label}
        </Badge>
        <div className="ml-auto">
          <IconDelete
            label="Delete block"
            pending={del.isPending}
            onClick={() => {
              if (window.confirm('Delete this block?')) del.mutate()
            }}
          />
        </div>
      </div>
      {block.type === 'text' && <TextBlockBody block={block} onSave={(c) => save.mutate(c)} saving={save.isPending} />}
      {block.type === 'video' && <VideoBlockBody block={block} onSave={(c) => save.mutate(c)} saving={save.isPending} />}
      {block.type === 'image' && <ImageBlockBody block={block} onSave={(c) => save.mutate(c)} saving={save.isPending} />}
    </div>
  )
}

function SaveBlockButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <Button size="sm" variant="accent" loading={saving} onClick={onClick}>
      <Save className="h-3.5 w-3.5" /> Save
    </Button>
  )
}

function TextBlockBody({
  block, onSave, saving,
}: {
  block: LessonBlock
  onSave: (content: Record<string, unknown>) => void
  saving: boolean
}) {
  const [markdown, setMarkdown] = React.useState(String(block.content.markdown ?? ''))
  return (
    <div className="space-y-2">
      <Textarea
        aria-label="Text content"
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        placeholder="Write content (markdown supported)…"
      />
      <div className="flex justify-end">
        <SaveBlockButton saving={saving} onClick={() => onSave({ markdown })} />
      </div>
    </div>
  )
}

function VideoBlockBody({
  block, onSave, saving,
}: {
  block: LessonBlock
  onSave: (content: Record<string, unknown>) => void
  saving: boolean
}) {
  const [url, setUrl] = React.useState(String(block.content.url ?? ''))
  const [caption, setCaption] = React.useState(String(block.content.caption ?? ''))
  const youtubeId = parseYouTubeId(url)
  const blockId = block.id
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`vid-url-${blockId}`}>YouTube URL</Label>
        <Input
          id={`vid-url-${blockId}`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=…"
        />
      </div>
      <div>
        <Label htmlFor={`vid-cap-${blockId}`}>Caption</Label>
        <Input id={`vid-cap-${blockId}`} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
      {youtubeId ? (
        <div className="aspect-video overflow-hidden rounded-lg border border-(--color-border)">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={caption || 'Video preview'}
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : url ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">Could not detect a YouTube video id from this URL.</p>
      ) : null}
      <div className="flex justify-end">
        <SaveBlockButton saving={saving} onClick={() => onSave({ url, youtube_id: youtubeId, caption })} />
      </div>
    </div>
  )
}

function ImageBlockBody({
  block, onSave, saving,
}: {
  block: LessonBlock
  onSave: (content: Record<string, unknown>) => void
  saving: boolean
}) {
  const [url, setUrl] = React.useState(String(block.content.url ?? ''))
  const [caption, setCaption] = React.useState(String(block.content.caption ?? ''))
  const blockId = block.id
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`img-url-${blockId}`}>Image URL</Label>
        <Input id={`img-url-${blockId}`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div>
        <Label htmlFor={`img-cap-${blockId}`}>Caption</Label>
        <Input id={`img-cap-${blockId}`} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
      {url && (
        <img
          src={url}
          alt={caption || 'Image preview'}
          title={caption || 'Image preview'}
          className="max-h-56 rounded-lg border border-(--color-border) object-contain"
        />
      )}
      <div className="flex justify-end">
        <SaveBlockButton saving={saving} onClick={() => onSave({ url, caption })} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quiz section (module or lesson)
// ---------------------------------------------------------------------------

function QuizSection({
  quiz, kind, parentId,
}: {
  quiz: Quiz | null
  kind: 'module' | 'lesson'
  parentId: string
}) {
  const create = useAction(
    () =>
      api.post('/lms/quizzes', {
        ...(kind === 'module' ? { module_id: parentId } : { lesson_id: parentId }),
        title: kind === 'module' ? 'Module Quiz' : 'Lesson Quiz',
      }),
    { success: 'Quiz created', error: 'Could not create quiz' },
  )

  if (!quiz) {
    return (
      <div className="rounded-lg border border-dashed border-(--color-border) p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-(--color-muted-foreground)">
            <HelpCircle className="h-4 w-4" /> No {kind} quiz yet.
          </div>
          <Button size="sm" variant="outline" loading={create.isPending} onClick={() => create.mutate()}>
            <Plus className="h-3.5 w-3.5" /> Add {kind} quiz
          </Button>
        </div>
      </div>
    )
  }
  return <QuizEditor quiz={quiz} kind={kind} />
}

function QuizEditor({ quiz, kind }: { quiz: Quiz; kind: 'module' | 'lesson' }) {
  const [pass, setPass] = React.useState(String(quiz.pass_percentage))
  const [maxAttempts, setMaxAttempts] = React.useState(quiz.max_attempts != null ? String(quiz.max_attempts) : '')

  const save = useAction(
    () =>
      api.patch(`/lms/quizzes/${quiz.id}`, {
        pass_percentage: Number(pass),
        max_attempts: maxAttempts === '' ? null : Number(maxAttempts),
      }),
    { success: 'Quiz saved', error: 'Could not save quiz' },
  )
  const del = useAction(() => api.delete(`/lms/quizzes/${quiz.id}`), {
    success: 'Quiz deleted',
    error: 'Could not delete quiz',
  })
  const addQuestion = useAction(
    (type: QuizQuestionType) => {
      const options: QuizOption[] =
        type === 'single_choice' || type === 'multi_choice'
          ? [
              { id: crypto.randomUUID(), text: '' },
              { id: crypto.randomUUID(), text: '' },
            ]
          : []
      const correct: unknown[] = type === 'true_false' ? [true] : type === 'short_answer' ? [''] : []
      return api.post(`/lms/quizzes/${quiz.id}/questions`, {
        prompt: '',
        type,
        order_index: quiz.questions.length,
        options,
        correct,
        points: 1,
      })
    },
    { success: 'Question added', error: 'Could not add question' },
  )
  const reorder = useAction(
    (ids: string[]) => api.post(`/lms/quizzes/${quiz.id}/questions/reorder`, { ids }),
    { error: 'Could not reorder questions' },
  )

  const [newType, setNewType] = React.useState<QuizQuestionType>('single_choice')
  const questions = [...quiz.questions].sort((a, b) => a.order_index - b.order_index)

  return (
    <Card className="border-indigo-200 dark:border-indigo-500/30">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-(--color-primary)" />
          {kind === 'module' ? 'Module Quiz' : 'Lesson Quiz'}
          <Badge variant="default" className="tabular-nums">{questions.length} Q</Badge>
        </CardTitle>
        <IconDelete
          label="Delete quiz"
          pending={del.isPending}
          onClick={() => {
            if (window.confirm('Delete this quiz and all its questions?')) del.mutate()
          }}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Label htmlFor={`pass-${quiz.id}`}>Pass %</Label>
            <Input id={`pass-${quiz.id}`} type="number" min={0} max={100} value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
          <div className="w-32">
            <Label htmlFor={`att-${quiz.id}`}>Max attempts</Label>
            <Input
              id={`att-${quiz.id}`}
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
              placeholder="∞"
            />
          </div>
          <SaveBlockButton saving={save.isPending} onClick={() => save.mutate()} />
        </div>

        <div className="space-y-2">
          {questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              count={questions.length}
              onMove={(dir) => reorder.mutate(moveIds(questions, i, dir))}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2 border-t border-(--color-border) pt-3">
          <div className="w-44">
            <Label htmlFor={`newq-${quiz.id}`}>Question type</Label>
            <Select id={`newq-${quiz.id}`} value={newType} onChange={(e) => setNewType(e.target.value as QuizQuestionType)}>
              {(Object.keys(QUESTION_TYPE_LABEL) as QuizQuestionType[]).map((t) => (
                <option key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</option>
              ))}
            </Select>
          </div>
          <Button size="sm" variant="outline" loading={addQuestion.isPending} onClick={() => addQuestion.mutate(newType)}>
            <Plus className="h-3.5 w-3.5" /> Add Question
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Question editor
// ---------------------------------------------------------------------------

function QuestionEditor({
  question, index, count, onMove,
}: {
  question: QuizQuestion
  index: number
  count: number
  onMove: (dir: -1 | 1) => void
}) {
  const [prompt, setPrompt] = React.useState(question.prompt)
  const [points, setPoints] = React.useState(String(question.points))
  const [explanation, setExplanation] = React.useState(question.explanation ?? '')
  const [options, setOptions] = React.useState<QuizOption[]>(question.options)
  const [correctChoices, setCorrectChoices] = React.useState<string[]>(
    question.type === 'single_choice' || question.type === 'multi_choice'
      ? (question.correct as string[])
      : [],
  )
  const [boolAnswer, setBoolAnswer] = React.useState<boolean>(
    question.type === 'true_false' ? question.correct[0] === true : true,
  )
  const [shortAnswers, setShortAnswers] = React.useState<string[]>(
    question.type === 'short_answer' ? (question.correct as string[]) : [''],
  )

  const del = useAction(() => api.delete(`/lms/questions/${question.id}`), {
    success: 'Question deleted',
    error: 'Could not delete question',
  })
  const save = useAction(
    () => {
      let correct: unknown[]
      if (question.type === 'true_false') correct = [boolAnswer]
      else if (question.type === 'short_answer') correct = shortAnswers.filter((s) => s.trim() !== '')
      else correct = correctChoices.filter((id) => options.some((o) => o.id === id))
      return api.patch(`/lms/questions/${question.id}`, {
        prompt,
        points: Number(points),
        explanation: explanation.trim() === '' ? null : explanation,
        options: question.type === 'single_choice' || question.type === 'multi_choice' ? options : [],
        correct,
      })
    },
    { success: 'Question saved', error: 'Could not save question' },
  )

  const q = question.id

  function updateOption(id: string, text: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)))
  }
  function removeOption(id: string) {
    setOptions((prev) => prev.filter((o) => o.id !== id))
    setCorrectChoices((prev) => prev.filter((c) => c !== id))
  }
  function addOption() {
    setOptions((prev) => [...prev, { id: crypto.randomUUID(), text: '' }])
  }
  function toggleChoice(id: string) {
    if (question.type === 'single_choice') {
      setCorrectChoices([id])
    } else {
      setCorrectChoices((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
    }
  }

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-card) p-3">
      <div className="mb-2 flex items-center gap-2">
        <ReorderControls
          onUp={() => onMove(-1)}
          onDown={() => onMove(1)}
          disableUp={index === 0}
          disableDown={index === count - 1}
        />
        <span className="inline-flex h-5 w-5 flex-none items-center justify-center rounded bg-(--color-muted) text-xs font-semibold tabular-nums text-(--color-muted-foreground)">
          {index + 1}
        </span>
        <Badge variant="primary">{QUESTION_TYPE_LABEL[question.type]}</Badge>
        <div className="ml-auto">
          <IconDelete
            label="Delete question"
            pending={del.isPending}
            onClick={() => {
              if (window.confirm('Delete this question?')) del.mutate()
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor={`prompt-${q}`}>Prompt</Label>
          <Textarea id={`prompt-${q}`} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-14" />
        </div>

        {(question.type === 'single_choice' || question.type === 'multi_choice') && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Options {question.type === 'single_choice' ? '(pick one correct)' : '(pick all correct)'}</Label>
              <Button size="sm" variant="ghost" onClick={addOption}>
                <Plus className="h-3.5 w-3.5" /> Option
              </Button>
            </div>
            {options.map((o) => {
              const checked = correctChoices.includes(o.id)
              return (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    type={question.type === 'single_choice' ? 'radio' : 'checkbox'}
                    name={`correct-${q}`}
                    aria-label="Mark correct"
                    checked={checked}
                    onChange={() => toggleChoice(o.id)}
                    className="h-4 w-4 flex-none cursor-pointer accent-emerald-600"
                  />
                  <Input value={o.text} onChange={(e) => updateOption(o.id, e.target.value)} placeholder="Option text" />
                  <button
                    type="button"
                    aria-label="Remove option"
                    onClick={() => removeOption(o.id)}
                    className="cursor-pointer rounded-md p-1.5 text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {question.type === 'true_false' && (
          <div>
            <Label className="mb-1">Correct answer</Label>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setBoolAnswer(v)}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    boolAnswer === v
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'border-(--color-border) text-(--color-muted-foreground) hover:bg-(--color-muted)',
                  )}
                >
                  {boolAnswer === v && <CircleCheck className="h-4 w-4" />} {v ? 'True' : 'False'}
                </button>
              ))}
            </div>
          </div>
        )}

        {question.type === 'short_answer' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Accepted answers</Label>
              <Button size="sm" variant="ghost" onClick={() => setShortAnswers((prev) => [...prev, ''])}>
                <Plus className="h-3.5 w-3.5" /> Answer
              </Button>
            </div>
            {shortAnswers.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={s}
                  onChange={(e) => setShortAnswers((prev) => prev.map((x, xi) => (xi === i ? e.target.value : x)))}
                  placeholder="Accepted answer"
                  aria-label={`Accepted answer ${i + 1}`}
                />
                <button
                  type="button"
                  aria-label="Remove answer"
                  onClick={() => setShortAnswers((prev) => prev.filter((_, xi) => xi !== i))}
                  className="cursor-pointer rounded-md p-1.5 text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-24">
            <Label htmlFor={`pts-${q}`}>Points</Label>
            <Input id={`pts-${q}`} type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} />
          </div>
          <div className="min-w-48 flex-1">
            <Label htmlFor={`exp-${q}`}>Explanation (optional)</Label>
            <Input id={`exp-${q}`} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </div>
          <SaveBlockButton saving={save.isPending} onClick={() => save.mutate()} />
        </div>
      </div>
    </div>
  )
}
