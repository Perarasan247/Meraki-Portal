import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Spinner shown while a lazily-loaded route chunk is fetched. */
export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-[40vh] items-center justify-center', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
    </div>
  )
}
