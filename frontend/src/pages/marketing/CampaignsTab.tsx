import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Megaphone } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Campaign, CampaignStatus } from '@/lib/types'

const STATUSES: CampaignStatus[] = ['Draft', 'Active', 'Completed']

export function CampaignsTab({ campaigns, isLoading }: { campaigns: Campaign[]; isLoading: boolean }) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const queryClient = useQueryClient()

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      api.patch(`/marketing/campaigns/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Could not update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/marketing/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign deleted')
    },
    onError: () => toast.error('Could not delete campaign'),
  })

  const filtered = campaigns.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false
    if (search && !`${c.name} ${c.target_audience ?? ''} ${c.program ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>All Campaigns</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search name, target, program…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Megaphone} title="No campaigns found" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell>{c.target_audience ?? '—'}</TableCell>
                  <TableCell>{formatCurrency(c.budget ?? 0)}</TableCell>
                  <TableCell>{c.leads_generated}</TableCell>
                  <TableCell>
                    <Select
                      value={c.status}
                      onChange={(e) => updateStatus.mutate({ id: c.id, status: e.target.value as CampaignStatus })}
                      className="h-8 w-32 text-xs"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </TableCell>
                  <TableCell>{formatDate(c.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(c.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
