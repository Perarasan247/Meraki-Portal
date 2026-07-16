import type { StudentLesson } from '@/lib/types'

// Per-course accent drawn from our --color-chart-* palette. Hashed from the
// course id so a course keeps the same colour across the catalog and classroom.
const ACCENTS = ['#059669', '#0d9488', '#0891b2', '#f59e0b', '#e11d48', '#2563eb']

export function courseAccent(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]
}

/** Cover gradient for a course, blended toward the dark base for depth. */
export function coverStyle(accent: string): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 55%, #0b1120) 100%)`,
  }
}

export type LessonKind = 'video' | 'reading'

export function lessonKind(lesson: StudentLesson): LessonKind {
  return lesson.blocks.some((b) => b.type === 'video') ? 'video' : 'reading'
}
