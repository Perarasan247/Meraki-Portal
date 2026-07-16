import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  /**
   * Action bar pinned to the bottom of the panel — stays visible while the body
   * scrolls. Submit buttons here live outside the <form>, so give the form an
   * `id` and point the button at it with `form="that-id"`.
   */
  footer?: React.ReactNode
  className?: string
  /**
   * Extra classes for the outermost layer — mainly to raise the z-index when a
   * dialog opens on top of another dialog (e.g. a confirm over an edit form).
   */
  containerClassName?: string
}

export function Dialog({
  open, onClose, title, description, children, footer, className, containerClassName,
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // Lock background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={cn('fixed inset-0 z-50', containerClassName)}>
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150" />
      {/* Clicking the backdrop area (anywhere outside the panel) closes the dialog. */}
      <div className="relative flex min-h-full items-center justify-center p-3 sm:p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            // Capped height + column layout: header and footer stay put, only the
            // body scrolls — so the actions never fall below the fold.
            'relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-card) shadow-2xl animate-in fade-in zoom-in-95 duration-150',
            className,
          )}
        >
          {/* Header — fixed */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-(--color-border) px-5 py-4">
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold sm:text-lg">{title}</h2>
              {description && (
                <p className="mt-1 text-sm text-(--color-muted-foreground)">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="shrink-0 cursor-pointer rounded-md p-1 text-(--color-muted-foreground) hover:bg-(--color-muted)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body — the only scrolling region */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {/* Footer — pinned, always reachable */}
          {footer && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-(--color-border) px-5 py-3.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
