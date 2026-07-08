import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** Small colored eyebrow label above the title */
  eyebrow?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * Consistent page header used across every portal section. The body content
 * below it is what should differ per section — not the heading.
 */
export function PageHeader({ title, subtitle, icon: Icon, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--color-sidebar-active) text-(--color-primary)">
            <Icon className="h-5.5 w-5.5" />
          </div>
        )}
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wide text-(--color-primary)">{eyebrow}</p>
          )}
          <h1 className="font-display text-2xl font-bold leading-tight text-(--color-foreground)">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-(--color-muted-foreground)">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
