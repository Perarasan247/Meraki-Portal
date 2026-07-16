import type { LucideIcon } from 'lucide-react'
import { Card } from './card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  accent?: 'primary' | 'accent' | 'warning' | 'danger'
  onClick?: () => void
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
}

export function StatCard({ label, value, hint, icon: Icon, accent = 'primary', onClick }: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn('p-5', onClick && 'cursor-pointer active:scale-[0.99]')}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-(--color-muted-foreground)">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-(--color-muted-foreground)">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', ACCENT_CLASSES[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  )
}
