import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './button'
import { Dialog } from './dialog'

export interface ConfirmOptions {
  title: string
  /** Body copy. Accepts JSX, so callers can pass a styled warning block. */
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' turns the confirm button red — use for destructive actions. */
  tone?: 'danger' | 'default'
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmCtx = React.createContext<ConfirmFn | null>(null)

/**
 * Themed replacement for window.confirm.
 *
 * Keeps the same one-liner shape so call sites stay readable:
 *   if (await confirm({ title: 'Delete this?', tone: 'danger' })) doIt()
 */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmCtx)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null)
  // Held across renders so the promise can be settled from the button handlers.
  const resolver = React.useRef<((value: boolean) => void) | null>(null)

  const confirm = React.useCallback<ConfirmFn>((next) => {
    setOpts(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = React.useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOpts(null)
  }, [])

  const danger = opts?.tone === 'danger'

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Dialog
        open={!!opts}
        // Esc / backdrop / ✕ all mean "no".
        onClose={() => settle(false)}
        title={opts?.title ?? ''}
        className="max-w-md"
        // Sits above a dialog that opened it (base dialogs are z-50).
        containerClassName="z-[60]"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => settle(false)}>
              {opts?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              type="button"
              variant={danger ? 'destructive' : 'default'}
              onClick={() => settle(true)}
            >
              {opts?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          {danger && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-(--color-destructive) dark:bg-rose-500/10">
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
          )}
          <div className="min-w-0 text-sm leading-relaxed text-(--color-muted-foreground)">
            {opts?.description}
          </div>
        </div>
      </Dialog>
    </ConfirmCtx.Provider>
  )
}
