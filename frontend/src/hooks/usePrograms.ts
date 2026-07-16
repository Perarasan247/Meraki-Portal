import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Domain } from '@/lib/types'

/**
 * Internship-domain labels for "Program" dropdowns — de-duplicated across
 * branches and sorted.
 *
 * Domains are stored per branch, so a domain offered in both Chennai and Salem
 * exists as two rows with the same label. Enquiries/enrollments/batches store
 * `program` as plain text, so the same label must appear only once.
 */
export function useProgramOptions(enabled = true): string[] {
  const { data } = useQuery({
    queryKey: ['domains', 'all'],
    queryFn: () => api.get<Domain[]>('/domains'),
    enabled,
  })
  return React.useMemo(
    () => [...new Set((data ?? []).map((d) => d.label))].sort((a, b) => a.localeCompare(b)),
    [data],
  )
}
