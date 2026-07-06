import { Megaphone, Mail, MessageCircle, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton, StatCardSkeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import type { Campaign, EmailCampaign, WhatsappBlast, LeadSourceAggregate, CampaignStatus } from '@/lib/types'

const STATUSES: CampaignStatus[] = ['Draft', 'Active', 'Completed']

export function MarketingDashboardTab({
  isLoading, campaigns, emailCampaigns, whatsappBlasts, leadSources, onViewAll,
}: {
  isLoading: boolean
  campaigns: Campaign[]
  emailCampaigns: EmailCampaign[]
  whatsappBlasts: WhatsappBlast[]
  leadSources: LeadSourceAggregate[]
  onViewAll: () => void
}) {
  const leadsTracked = campaigns.reduce((sum, c) => sum + (c.leads_generated ?? 0), 0)
  const recent = campaigns.slice(0, 5)
  const statusCounts = STATUSES.map((s) => [s, campaigns.filter((c) => c.status === s).length] as const)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Campaigns" value={campaigns.length} icon={Megaphone} accent="primary" />
            <StatCard label="Email Campaigns" value={emailCampaigns.length} icon={Mail} accent="accent" />
            <StatCard label="WhatsApp Blasts" value={whatsappBlasts.length} icon={MessageCircle} accent="warning" />
            <StatCard label="Leads Tracked" value={leadsTracked} icon={Target} accent="accent" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Lead Source Breakdown</CardTitle></CardHeader>
          <CardContent>
            {leadSources.length === 0 ? (
              <p className="text-sm text-(--color-muted-foreground)">
                No lead source data yet. Tag enquiries with a campaign source.
              </p>
            ) : (
              <div className="space-y-2">
                {leadSources.map((s) => (
                  <div key={s.source_name} className="flex items-center justify-between text-sm">
                    <span className="text-(--color-foreground)">{s.source_name}</span>
                    <span className="font-medium tabular-nums text-(--color-muted-foreground)">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Campaign Status Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {statusCounts.map(([status, count]) => (
                <div key={status} className="rounded-lg border border-(--color-border) p-3 text-center">
                  <p className="font-display text-lg font-bold">{count}</p>
                  <p className="mt-1"><StatusBadge status={status} /></p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Campaigns</CardTitle>
          <button onClick={onViewAll} className="cursor-pointer text-sm font-medium text-(--color-primary) hover:underline">
            View All
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : recent.length === 0 ? (
            <EmptyState icon={Megaphone} title="No campaigns yet. Click Campaign to create one." />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>{c.target_audience ?? '—'}</TableCell>
                    <TableCell>{formatCurrency(c.budget ?? 0)}</TableCell>
                    <TableCell>{c.leads_generated}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
