import * as React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, PlayCircle, FileText,
  Image as ImageIcon, Award, Clock, Loader2, BookOpen, ListChecks, ExternalLink,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Meter } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { courseAccent, coverStyle, lessonKind } from './courseTheme'
import type { LessonBlock, StudentCourse, StudentLesson, StudentModule, StudentQuiz } from '@/lib/types'
import { QuizRunner } from './QuizRunner'

type Item =
  | { id: string; moduleId: string; moduleTitle: string; kind: 'lesson'; title: string; lesson: StudentLesson }
  | { id: string; moduleId: string; moduleTitle: string; kind: 'quiz'; title: string; quiz: StudentQuiz }

function buildItems(modules: StudentModule[]): Item[] {
  const items: Item[] = []
  for (const m of modules) {
    for (const l of m.lessons) {
      items.push({ id: l.id, moduleId: m.id, moduleTitle: m.title, kind: 'lesson', title: l.title, lesson: l })
    }
    if (m.quiz) items.push({ id: `mq:${m.id}`, moduleId: m.id, moduleTitle: m.title, kind: 'quiz', title: m.quiz.title, quiz: m.quiz })
  }
  return items
}
const itemDone = (it: Item) => (it.kind === 'lesson' ? it.lesson.completed : it.quiz.passed)

export default function CourseViewerPage() {
  const { curriculumId } = useParams<{ curriculumId: string }>()
  const queryClient = useQueryClient()
  const [selected, setSelected] = React.useState<string | null>(null)
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['student-course', curriculumId],
    queryFn: () => api.get<StudentCourse>(`/student/courses/${curriculumId}`),
    enabled: !!curriculumId,
  })

  const items = React.useMemo(() => (course ? buildItems(course.modules) : []), [course])

  // Resume: first incomplete item, else first item.
  React.useEffect(() => {
    if (!selected && items.length) {
      setSelected((items.find((it) => !itemDone(it)) ?? items[0]).id)
    }
  }, [items, selected])

  const complete = useMutation({
    mutationFn: (lessonId: string) => api.post(`/student/lessons/${lessonId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-course', curriculumId] })
      queryClient.invalidateQueries({ queryKey: ['student-courses'] })
    },
    onError: () => toast.error('Could not update progress'),
  })

  const refetchCourse = () => {
    queryClient.invalidateQueries({ queryKey: ['student-course', curriculumId] })
    queryClient.invalidateQueries({ queryKey: ['student-courses'] })
  }

  function selectItem(id: string) {
    const mod = id.startsWith('mq:') ? id.slice(3) : items.find((it) => it.id === id)?.moduleId
    if (mod) setCollapsed((prev) => { const n = new Set(prev); n.delete(mod); return n })
    setSelected(id)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
      </div>
    )
  }
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        icon={FileText}
        title="Course not available"
        description="This course isn't part of your internship domain, or it hasn't been published."
      />
    )
  }
  if (!course) return null

  const accent = courseAccent(course.id)
  const doneCount = items.filter(itemDone).length
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const idx = items.findIndex((it) => it.id === selected)
  const current = idx >= 0 ? items[idx] : null
  const prev = idx > 0 ? items[idx - 1] : null
  const next = idx >= 0 && idx < items.length - 1 ? items[idx + 1] : null

  function toggleModule(id: string) {
    setCollapsed((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  return (
    <div className="space-y-5">
      {/* Sticky course bar with overall progress */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-(--color-border) bg-(--color-background)/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/learn" className="rounded-md p-1.5 hover:bg-(--color-muted)" aria-label="Back to My Learning">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={coverStyle(accent)}>
            <BookOpen className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-(--color-muted-foreground)">{course.program}</p>
            <h1 className="truncate font-display text-base font-bold leading-tight sm:text-lg">{course.title}</h1>
          </div>
          <div className="hidden w-48 shrink-0 sm:block">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-(--color-muted-foreground)">Progress</span>
              <span className="font-display font-bold tabular-nums text-(--color-primary)">{pct}%</span>
            </div>
            <Meter value={doneCount} max={items.length || 1} tone={pct === 100 ? 'accent' : 'primary'} size="sm" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Syllabus */}
        <aside className="lg:sticky lg:top-32 lg:max-h-[calc(100dvh-9rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <p className="mb-3 flex items-center gap-2 px-1 font-display text-sm font-bold">
            <ListChecks className="h-4 w-4 text-(--color-primary)" /> Course content
          </p>
          {course.modules.length === 0 ? (
            <p className="px-1 text-sm text-(--color-muted-foreground)">No content yet.</p>
          ) : (
            <div className="space-y-2">
              {course.modules.map((m, mi) => (
                <ModuleSection
                  key={m.id}
                  module={m}
                  index={mi}
                  open={!collapsed.has(m.id)}
                  selected={selected}
                  onToggle={() => toggleModule(m.id)}
                  onSelect={selectItem}
                />
              ))}
            </div>
          )}
        </aside>

        {/* Content */}
        <section className="min-w-0">
          {current?.kind === 'quiz' ? (
            <QuizRunner quiz={current.quiz} onSubmitted={refetchCourse} />
          ) : current?.kind === 'lesson' ? (
            <LessonView
              lesson={current.lesson}
              onComplete={() => complete.mutate(current.lesson.id)}
              completing={complete.isPending}
              onQuizSubmitted={refetchCourse}
            />
          ) : (
            <EmptyState icon={FileText} title="Select a lesson" description="Pick a lesson from the outline to begin." />
          )}

          {/* Footer navigation */}
          {current && (
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-(--color-border) pt-5">
              <Button variant="outline" disabled={!prev} onClick={() => prev && selectItem(prev.id)}>
                <ArrowLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="hidden text-xs text-(--color-muted-foreground) sm:block">
                {idx + 1} of {items.length}
              </span>
              {current.kind === 'lesson' && !current.lesson.completed ? (
                <Button
                  variant="accent"
                  loading={complete.isPending}
                  onClick={() => {
                    complete.mutate(current.lesson.id, { onSuccess: () => next && selectItem(next.id) })
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" /> {next ? 'Complete & continue' : 'Mark complete'}
                </Button>
              ) : (
                <Button disabled={!next} onClick={() => next && selectItem(next.id)}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ModuleSection({
  module: m, index, open, selected, onToggle, onSelect,
}: {
  module: StudentModule
  index: number
  open: boolean
  selected: string | null
  onToggle: () => void
  onSelect: (id: string) => void
}) {
  const lessonsDone = m.lessons.filter((l) => l.completed).length
  const total = m.lessons.length + (m.quiz ? 1 : 0)
  const done = lessonsDone + (m.quiz?.passed ? 1 : 0)
  const moduleComplete = total > 0 && done === total

  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-card)">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left hover:bg-(--color-muted)/50"
      >
        <span className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          moduleComplete ? 'bg-emerald-500 text-white' : 'bg-(--color-sidebar-active) text-(--color-primary)',
        )}>
          {moduleComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold">{m.title}</span>
          <span className="text-xs text-(--color-muted-foreground)">{done}/{total} complete</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-(--color-muted-foreground) transition-transform', !open && '-rotate-90')} />
      </button>

      {open && (
        <div className="border-t border-(--color-border) p-1.5">
          {m.lessons.map((l) => (
            <ItemRow
              key={l.id}
              active={selected === l.id}
              done={l.completed}
              icon={lessonKind(l) === 'video' ? PlayCircle : FileText}
              title={l.title}
              meta={l.estimated_minutes != null ? `${l.estimated_minutes} min` : undefined}
              onClick={() => onSelect(l.id)}
            />
          ))}
          {m.quiz && (
            <ItemRow
              active={selected === `mq:${m.id}`}
              done={m.quiz.passed}
              icon={Award}
              title={m.quiz.title}
              meta={`${m.quiz.questions.length} questions`}
              accentIcon
              onClick={() => onSelect(`mq:${m.id}`)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ItemRow({
  active, done, icon: Icon, title, meta, accentIcon, onClick,
}: {
  active: boolean
  done: boolean
  icon: typeof FileText
  title: string
  meta?: string
  accentIcon?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
        active ? 'bg-(--color-sidebar-active) font-medium text-(--color-primary)' : 'hover:bg-(--color-muted)',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', accentIcon && !active ? 'text-(--color-primary)' : active ? 'text-(--color-primary)' : 'text-(--color-muted-foreground)')} />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : meta ? (
        <span className="shrink-0 text-[11px] tabular-nums text-(--color-muted-foreground)">{meta}</span>
      ) : null}
    </button>
  )
}

function LessonView({
  lesson, onComplete, completing, onQuizSubmitted,
}: {
  lesson: StudentLesson
  onComplete: () => void
  completing: boolean
  onQuizSubmitted: () => void
}) {
  const kind = lessonKind(lesson)
  return (
    <article className="space-y-5">
      <header className="space-y-2 border-b border-(--color-border) pb-4">
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={kind === 'video' ? 'info' : 'primary'}>
            {kind === 'video' ? <><PlayCircle className="h-3.5 w-3.5" /> Video</> : <><FileText className="h-3.5 w-3.5" /> Reading</>}
          </Badge>
          {lesson.estimated_minutes != null && (
            <span className="inline-flex items-center gap-1 text-(--color-muted-foreground)">
              <Clock className="h-3.5 w-3.5" /> {lesson.estimated_minutes} min
            </span>
          )}
          {lesson.completed && (
            <Badge variant="success"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</Badge>
          )}
        </div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">{lesson.title}</h2>
      </header>

      <div className="space-y-4">
        {lesson.blocks.length === 0 && (
          <p className="text-sm text-(--color-muted-foreground)">This lesson has no content yet.</p>
        )}
        {lesson.blocks.map((b) => <ContentBlock key={b.id} block={b} />)}
      </div>

      {!lesson.completed && (
        <div className="flex justify-end">
          <Button variant="accent" loading={completing} onClick={onComplete}>
            <CheckCircle2 className="h-4 w-4" /> Mark as complete
          </Button>
        </div>
      )}

      {lesson.quiz && (
        <div className="pt-2">
          <QuizRunner quiz={lesson.quiz} onSubmitted={onQuizSubmitted} />
        </div>
      )}
    </article>
  )
}

function youtubeId(content: Record<string, unknown>): string | null {
  if (typeof content.youtube_id === 'string' && content.youtube_id) return content.youtube_id
  const url = typeof content.url === 'string' ? content.url : ''
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/)
  return m ? m[1] : null
}

function ContentBlock({ block }: { block: LessonBlock }) {
  const c = block.content ?? {}

  if (block.type === 'text') {
    const md = typeof c.markdown === 'string' ? c.markdown : ''
    const title = typeof c.title === 'string' ? c.title : ''
    const link = safeHref(typeof c.url === 'string' ? c.url : '')
    return (
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-5 sm:p-6">
        {title && (
          <h3 className="mb-3 font-display text-lg font-bold text-(--color-foreground) sm:text-xl">{title}</h3>
        )}
        <Prose text={md} />
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-primary) transition-colors hover:bg-(--color-sidebar-active)"
          >
            Read the full article <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    )
  }

  if (block.type === 'video') {
    const yid = youtubeId(c)
    const url = typeof c.url === 'string' ? c.url : ''
    const caption = typeof c.caption === 'string' ? c.caption : ''

    // Poster placeholder (used in the offline demo where embeds are blocked).
    if (c.placeholder) {
      return (
        <figure className="overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-card)">
          <div
            className="relative flex aspect-video w-full items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #047857 100%)' }}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur transition-transform hover:scale-105">
              <PlayCircle className="h-9 w-9 text-white" />
            </span>
            <span className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/85">
              <PlayCircle className="h-3.5 w-3.5" /> Sample lesson video
            </span>
          </div>
          {caption && <figcaption className="px-4 py-3 text-xs text-(--color-muted-foreground)">{caption}</figcaption>}
        </figure>
      )
    }

    return (
      <figure className="overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-card)">
        <div className="aspect-video w-full bg-black">
          {yid ? (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${yid}`}
              title={caption || 'Lesson video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : url ? (
            <video className="h-full w-full" src={url} controls />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-white/70">
              <PlayCircle className="h-5 w-5" /> No video source
            </div>
          )}
        </div>
        {caption && <figcaption className="px-4 py-3 text-xs text-(--color-muted-foreground)">{caption}</figcaption>}
      </figure>
    )
  }

  // image
  const url = typeof c.url === 'string' ? c.url : ''
  const caption = typeof c.caption === 'string' ? c.caption : ''
  return (
    <figure className="overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-3">
      {url ? (
        <img src={url} alt={caption || 'Lesson image'} className="max-h-[480px] w-full rounded-lg object-contain" />
      ) : (
        <p className="flex items-center gap-2 p-2 text-sm text-(--color-muted-foreground)"><ImageIcon className="h-4 w-4" /> No image source</p>
      )}
      {caption && <figcaption className="px-1 pt-2 text-xs text-(--color-muted-foreground)">{caption}</figcaption>}
    </figure>
  )
}

/** Lightweight markdown-ish renderer: paragraphs, **bold**, `code`, and
 * 1. / - list lines. Good enough for lesson copy without a markdown dep. */
function Prose({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-3 text-sm leading-relaxed text-(--color-foreground)">
      {lines.map((line, i) => {
        const t = line.trim()
        if (!t) return null
        const isBullet = /^[-*]\s+/.test(t)
        const isNum = /^\d+\.\s+/.test(t)
        const body = t.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '')
        const content = renderInline(body)
        if (isBullet || isNum) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-primary)" />
              <p>{content}</p>
            </div>
          )
        }
        return <p key={i}>{content}</p>
      })}
    </div>
  )
}

/** Only http(s) links are rendered as anchors — blocks javascript:/data: URLs
 * coming from authored content. Returns undefined when the URL isn't safe. */
function safeHref(url: string): string | undefined {
  const u = url.trim()
  return /^https?:\/\//i.test(u) ? u : undefined
}

const LINK_CLASS =
  'font-medium text-(--color-primary) underline underline-offset-2 hover:opacity-80'

function renderInline(text: string): React.ReactNode[] {
  // Split on **bold**, `code`, [label](url) and bare http(s) URLs, keeping delimiters.
  const parts = text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s]+)/g)
    .filter(Boolean)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`')) {
      return <code key={i} className="rounded bg-(--color-muted) px-1.5 py-0.5 font-mono text-[0.85em]">{p.slice(1, -1)}</code>
    }
    // [label](url)
    const md = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (md) {
      const href = safeHref(md[2])
      if (!href) return <React.Fragment key={i}>{md[1]}</React.Fragment>
      return (
        <a key={i} href={href} target="_blank" rel="noreferrer noopener" className={LINK_CLASS}>
          {md[1]}
        </a>
      )
    }
    // Bare URL
    const bare = safeHref(p)
    if (bare) {
      return (
        <a key={i} href={bare} target="_blank" rel="noreferrer noopener" className={LINK_CLASS}>
          {p}
        </a>
      )
    }
    return <React.Fragment key={i}>{p}</React.Fragment>
  })
}
