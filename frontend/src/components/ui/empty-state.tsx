import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-(--radius-card) border border-dashed border-(--color-border) px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-(--color-muted)">
        <Icon className="h-6 w-6 text-(--color-muted-foreground)" />
      </div>
      <p className="font-display text-sm font-semibold text-(--color-foreground)">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-(--color-muted-foreground)">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
