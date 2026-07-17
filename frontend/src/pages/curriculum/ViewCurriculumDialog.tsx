import { useQuery } from '@tanstack/react-query'
import { Pencil, Wrench } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Branch, Curriculum, Domain } from '@/lib/types'

/** Read-only detail view, opened by clicking a row in the list. */
export function ViewCurriculumDialog({
  curriculum,
  onClose,
  onEdit,
  onBuild,
}: {
  curriculum: Curriculum | null
  onClose: () => void
  onEdit: (c: Curriculum) => void
  onBuild: (c: Curriculum) => void
}) {
  const open = !!curriculum

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })
  const { data: domains } = useQuery({
    queryKey: ['domains', 'all'],
    queryFn: () => api.get<Domain[]>('/domains'),
    enabled: open,
  })

  if (!curriculum) return null

  const c = curriculum
  const branchName = branches?.find((b) => b.id === c.branch_id)?.name
  const domainLabel = c.domain_id ? domains?.find((d) => d.id === c.domain_id)?.label : undefined
  const phases = [...(c.phases ?? [])].sort((a, b) => a.order - b.order)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.title}
      description="Curriculum details"
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="button" variant="outline" onClick={() => onEdit(c)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button type="button" onClick={() => onBuild(c)}>
            <Wrench className="h-4 w-4" /> Build content
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{c.scope}</Badge>
          <StatusBadge status={c.status} />
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Program" value={c.program} />
          <Field label="Domain" value={domainLabel ?? 'Unassigned (hidden from students)'} />
          <Field label="Branch" value={branchName} />
          <Field label="Created" value={formatDate(c.created_at)} />
        </dl>

        <div>
          <h4 className="text-xs font-medium text-(--color-muted-foreground)">
            Phases ({phases.length})
          </h4>
          {phases.length === 0 ? (
            <p className="mt-2 text-sm text-(--color-muted-foreground)">
              No phases yet — add them in the builder.
            </p>
          ) : (
            <ol className="mt-2 space-y-1.5">
              {phases.map((p, i) => (
                <li key={p.id} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--color-sidebar-active) text-[11px] font-semibold text-(--color-primary)">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="text-(--color-foreground)">{p.title}</span>
                    {p.description && (
                      <span className="block text-xs text-(--color-muted-foreground)">{p.description}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-(--color-muted-foreground)">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-(--color-foreground)" title={value ?? undefined}>
        {value?.toString().trim() ? value : <span className="text-(--color-muted-foreground)">—</span>}
      </dd>
    </div>
  )
}
