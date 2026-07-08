import { cn } from '@/lib/utils'

type Tone = 'primary' | 'accent' | 'warning' | 'danger'

const BAR_TONE: Record<Tone, string> = {
  primary: 'bg-(--color-primary)',
  accent: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
}

const RING_TONE: Record<Tone, string> = {
  primary: 'text-(--color-primary)',
  accent: 'text-emerald-500',
  warning: 'text-amber-500',
  danger: 'text-rose-500',
}

/** Horizontal progress meter — fee paid, seats filled, etc. */
export function Meter({
  value,
  max = 100,
  tone = 'primary',
  className,
  size = 'md',
}: {
  value: number
  max?: number
  tone?: Tone
  className?: string
  size?: 'sm' | 'md'
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-(--color-muted)', size === 'sm' ? 'h-1.5' : 'h-2.5', className)}>
      <div className={cn('h-full rounded-full transition-all duration-300', BAR_TONE[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Circular progress ring — attendance %, completion, etc. */
export function Ring({
  value,
  max = 100,
  tone = 'primary',
  size = 56,
  stroke = 5,
  label,
}: {
  value: number
  max?: number
  tone?: Tone
  size?: number
  stroke?: number
  label?: string
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-(--color-muted)" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn('fill-none transition-all duration-500', RING_TONE[tone], 'stroke-current')}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-display text-xs font-bold tabular-nums text-(--color-foreground)">
        {label ?? `${Math.round(pct)}%`}
      </span>
    </div>
  )
}
