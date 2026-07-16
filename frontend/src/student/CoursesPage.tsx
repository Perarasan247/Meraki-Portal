import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BookOpen, GraduationCap, ArrowRight, CheckCircle2, Trophy,
  Layers, PlayCircle, Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Meter } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { courseAccent, coverStyle } from './courseTheme'
import type { StudentCourseSummary } from '@/lib/types'

export default function CoursesPage() {
  const { student } = useAuth()
  const { data: courses, isLoading } = useQuery({
    queryKey: ['student-courses'],
    queryFn: () => api.get<StudentCourseSummary[]>('/student/courses'),
  })

  const list = courses ?? []
  const totals = list.reduce(
    (a, c) => {
      a.lessons += c.total_lessons
      a.done += c.completed_lessons
      if (c.progress_pct === 100) a.certs += 1
      return a
    },
    { lessons: 0, done: 0, certs: 0 },
  )
  const overall = totals.lessons ? Math.round((totals.done / totals.lessons) * 100) : 0
  // Resume target: the furthest-along course still in progress, else the first
  // unstarted one, else nothing (all complete).
  const inProgress = list.filter((c) => c.progress_pct > 0 && c.progress_pct < 100)
    .sort((a, b) => b.progress_pct - a.progress_pct)
  const resume = inProgress[0] ?? list.find((c) => c.progress_pct === 0) ?? null
  const firstName = student?.full_name?.split(' ')[0]

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-(--color-primary)">
          <Sparkles className="h-3.5 w-3.5" /> {student?.domain_label ?? 'Internship'}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-(--color-muted-foreground)">
          Keep going — pick up where you left off in your learning track.
        </p>
      </div>

      {isLoading ? (
        <>
          <Skeleton className="h-44 w-full rounded-(--radius-card)" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-(--radius-card)" />)}
          </div>
        </>
      ) : !student?.domain_id ? (
        <EmptyState
          icon={GraduationCap}
          title="No domain assigned yet"
          description="Your account hasn't been assigned an internship domain. Please contact your administrator."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses published yet"
          description="Course content for your domain is being prepared. Check back soon."
        />
      ) : (
        <>
          {resume && <ResumeHero course={resume} />}

          <StatStrip
            courses={list.length}
            done={totals.done}
            lessons={totals.lessons}
            overall={overall}
            certs={totals.certs}
          />

          <section className="space-y-4">
            <h2 className="font-display text-lg font-bold">Your courses</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function ResumeHero({ course }: { course: StudentCourseSummary }) {
  const accent = courseAccent(course.id)
  const started = course.progress_pct > 0
  return (
    <Link
      to={`/learn/courses/${course.id}`}
      className="group grid overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-card) shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-card-hover) sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
    >
      {/* Cover */}
      <div className="relative min-h-36 overflow-hidden p-6 text-white" style={coverStyle(accent)}>
        <BookOpen className="pointer-events-none absolute -bottom-6 -right-4 h-40 w-40 opacity-15" strokeWidth={1} />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur">
          {started ? 'Jump back in' : 'Start learning'}
        </span>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-white/80">{course.program}</p>
        <h3 className="mt-1 font-display text-xl font-bold leading-snug sm:text-2xl">{course.title}</h3>
      </div>
      {/* Body */}
      <div className="flex flex-col justify-center gap-4 p-6">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{started ? 'Your progress' : 'Not started yet'}</span>
            <span className="font-display font-bold tabular-nums text-(--color-primary)">{course.progress_pct}%</span>
          </div>
          <Meter value={course.completed_lessons} max={course.total_lessons || 1} className="mt-2" />
          <p className="mt-2 text-xs text-(--color-muted-foreground)">
            {course.completed_lessons} of {course.total_lessons} lessons complete
          </p>
        </div>
        <span
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-(--color-primary) px-5 py-2.5 text-sm font-semibold text-(--color-primary-foreground) shadow-sm transition-all group-hover:gap-3"
        >
          {started ? 'Continue learning' : 'Start course'} <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}

function StatStrip({
  courses, done, lessons, overall, certs,
}: {
  courses: number; done: number; lessons: number; overall: number; certs: number
}) {
  const items = [
    { icon: Layers, label: 'Courses', value: String(courses), tone: 'text-(--color-primary)' },
    { icon: PlayCircle, label: 'Lessons done', value: `${done}/${lessons}`, tone: 'text-cyan-500' },
    { icon: CheckCircle2, label: 'Overall progress', value: `${overall}%`, tone: 'text-emerald-500' },
    { icon: Trophy, label: 'Certificates', value: String(certs), tone: 'text-amber-500' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-4 shadow-(--shadow-card)">
          <it.icon className={cn('h-5 w-5', it.tone)} />
          <p className="mt-3 font-display text-2xl font-bold tabular-nums">{it.value}</p>
          <p className="text-xs text-(--color-muted-foreground)">{it.label}</p>
        </div>
      ))}
    </div>
  )
}

function CourseCard({ course }: { course: StudentCourseSummary }) {
  const accent = courseAccent(course.id)
  const done = course.progress_pct === 100
  const started = course.progress_pct > 0
  const cta = done ? 'Review course' : started ? 'Continue' : 'Start course'
  return (
    <Link
      to={`/learn/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-card) shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-card-hover)"
    >
      {/* Cover */}
      <div className="relative h-28 overflow-hidden p-4 text-white" style={coverStyle(accent)}>
        <BookOpen className="pointer-events-none absolute -bottom-5 -right-3 h-28 w-28 opacity-15" strokeWidth={1} />
        <span className="inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
          {course.program}
        </span>
        {done && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        )}
      </div>
      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display font-semibold leading-snug line-clamp-2">{course.title}</h3>
        <p className="mt-1 text-xs text-(--color-muted-foreground)">
          {course.total_lessons} lessons
        </p>

        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-(--color-muted-foreground)">{course.progress_pct}% complete</span>
            <span className="tabular-nums text-(--color-muted-foreground)">
              {course.completed_lessons}/{course.total_lessons}
            </span>
          </div>
          <Meter
            value={course.completed_lessons}
            max={course.total_lessons || 1}
            tone={done ? 'accent' : 'primary'}
            size="sm"
          />
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-(--color-primary) transition-all group-hover:gap-2">
            {cta} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
