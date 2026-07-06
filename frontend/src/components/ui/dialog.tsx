import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16 sm:pt-24">
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-6 shadow-2xl duration-150',
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-(--color-muted-foreground)">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="cursor-pointer rounded-md p-1 text-(--color-muted-foreground) hover:bg-(--color-muted)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
