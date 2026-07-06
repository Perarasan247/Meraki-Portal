import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus } from 'lucide-react'
import { api, downloadExport } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Campaign, EmailCampaign, WhatsappBlast, LeadSourceAggregate } from '@/lib/types'
import { MarketingDashboardTab } from '@/pages/marketing/DashboardTab'
import { CampaignsTab } from '@/pages/marketing/CampaignsTab'
import { EmailTab } from '@/pages/marketing/EmailTab'
import { WhatsappTab } from '@/pages/marketing/WhatsappTab'
import { LeadSourcesTab } from '@/pages/marketing/LeadSourcesTab'
import { NewCampaignDialog } from '@/pages/marketing/NewCampaignDialog'

const TABS = ['Dashboard', 'Campaigns', 'Email', 'WhatsApp', 'Lead Sources'] as const
type Tab = (typeof TABS)[number]

const EXPORTS: Record<Tab, { path: string; filename: string } | null> = {
  Dashboard: { path: '/marketing/campaigns/export', filename: 'campaigns.xlsx' },
  Campaigns: { path: '/marketing/campaigns/export', filename: 'campaigns.xlsx' },
  Email: { path: '/marketing/email/export', filename: 'email_campaigns.xlsx' },
  WhatsApp: { path: '/marketing/whatsapp/export', filename: 'whatsapp_blasts.xlsx' },
  'Lead Sources': null,
}

export default function MarketingPage() {
  const [tab, setTab] = React.useState<Tab>('Dashboard')
  const [campaignFormOpen, setCampaignFormOpen] = React.useState(false)
  const branchParam = useBranchQueryParam()
  const qs = branchParam ? `?${branchParam}` : ''

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns', branchParam],
    queryFn: () => api.get<Campaign[]>(`/marketing/campaigns${qs}`),
  })
  const { data: emailCampaigns, isLoading: emailLoading } = useQuery({
    queryKey: ['email-campaigns', branchParam],
    queryFn: () => api.get<EmailCampaign[]>(`/marketing/email${qs}`),
  })
  const { data: whatsappBlasts, isLoading: whatsappLoading } = useQuery({
    queryKey: ['whatsapp-blasts', branchParam],
    queryFn: () => api.get<WhatsappBlast[]>(`/marketing/whatsapp${qs}`),
  })
  const { data: leadSources, isLoading: leadSourcesLoading } = useQuery({
    queryKey: ['lead-sources-aggregate', branchParam],
    queryFn: () => api.get<LeadSourceAggregate[]>(`/marketing/lead-sources/aggregate${qs}`),
  })

  const exportConfig = EXPORTS[tab]

  async function handleExport() {
    if (!exportConfig) return
    try {
      await downloadExport(exportConfig.path, exportConfig.filename)
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Marketing Hub</h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">Plan campaigns and track lead generation.</p>
        </div>
        <div className="flex items-center gap-2">
          {exportConfig && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          )}
          <Button onClick={() => setCampaignFormOpen(true)}>
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap rounded-lg border border-(--color-border) p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t ? 'bg-(--color-primary) text-(--color-primary-foreground)' : 'text-(--color-muted-foreground) hover:bg-(--color-muted)',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Dashboard' && (
        <MarketingDashboardTab
          isLoading={campaignsLoading || emailLoading || whatsappLoading || leadSourcesLoading}
          campaigns={campaigns ?? []}
          emailCampaigns={emailCampaigns ?? []}
          whatsappBlasts={whatsappBlasts ?? []}
          leadSources={leadSources ?? []}
          onViewAll={() => setTab('Campaigns')}
        />
      )}
      {tab === 'Campaigns' && <CampaignsTab campaigns={campaigns ?? []} isLoading={campaignsLoading} />}
      {tab === 'Email' && (
        <EmailTab emailCampaigns={emailCampaigns ?? []} campaigns={campaigns ?? []} isLoading={emailLoading} />
      )}
      {tab === 'WhatsApp' && (
        <WhatsappTab whatsappBlasts={whatsappBlasts ?? []} campaigns={campaigns ?? []} isLoading={whatsappLoading} />
      )}
      {tab === 'Lead Sources' && <LeadSourcesTab leadSources={leadSources ?? []} isLoading={leadSourcesLoading} />}

      <NewCampaignDialog open={campaignFormOpen} onClose={() => setCampaignFormOpen(false)} />
    </div>
  )
}
