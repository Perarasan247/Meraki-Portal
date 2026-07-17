import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  // whitespace-nowrap: a pill is a single-line shape — letting it wrap turns the
  // full radius into a lozenge and pushes its table row taller than the rest.
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-(--color-muted) text-(--color-muted-foreground)',
        primary: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        danger: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

const STATUS_VARIANT: Record<string, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  New: 'info',
  Contacted: 'warning',
  Interested: 'primary',
  Converted: 'success',
  Paid: 'success',
  Partial: 'warning',
  Pending: 'danger',
  Draft: 'default',
  Published: 'success',
  Upcoming: 'info',
  Active: 'success',
  Completed: 'default',
  Approved: 'success',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? 'default'}>{status}</Badge>
}
