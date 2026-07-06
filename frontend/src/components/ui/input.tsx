import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-(--color-input) bg-(--color-card) px-3 py-2 text-sm text-(--color-foreground) placeholder:text-(--color-muted-foreground) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-ring) disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-20 w-full rounded-lg border border-(--color-input) bg-(--color-card) px-3 py-2 text-sm text-(--color-foreground) placeholder:text-(--color-muted-foreground) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-ring) disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('mb-1.5 block text-sm font-medium text-(--color-foreground)', className)} {...props} />
)

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-(--color-input) bg-(--color-card) px-3 py-2 text-sm text-(--color-foreground) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-ring) disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'
