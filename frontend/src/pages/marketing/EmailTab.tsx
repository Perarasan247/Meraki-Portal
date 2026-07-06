import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Mail, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { EmailCampaign, Campaign } from '@/lib/types'

export function EmailTab({ emailCampaigns, campaigns, isLoading }: { emailCampaigns: EmailCampaign[]; campaigns: Campaign[]; isLoading: boolean }) {
  const [formOpen, setFormOpen] = React.useState(false)
  const queryClient = useQueryClient()

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/marketing/email/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] })
      toast.success('Email campaign sent (mock)')
    },
    onError: () => toast.error('Could not send email campaign'),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New Email Campaign
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Email Campaigns</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : emailCampaigns.length === 0 ? (
            <EmptyState icon={Mail} title="No email campaigns yet" description="Create one to start reaching your audience." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailCampaigns.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.subject}</TableCell>
                    <TableCell>{e.recipients_count}</TableCell>
                    <TableCell>{e.delivered_count}</TableCell>
                    <TableCell>{e.sent_at ? formatDate(e.sent_at) : '—'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!e.sent_at}
                        loading={sendMutation.isPending}
                        onClick={() => sendMutation.mutate(e.id)}
                      >
                        Send
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewEmailCampaignDialog open={formOpen} onClose={() => setFormOpen(false)} campaigns={campaigns} />
    </div>
  )
}

function NewEmailCampaignDialog({ open, onClose, campaigns }: { open: boolean; onClose: () => void; campaigns: Campaign[] }) {
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({ subject: '', content: '', recipients_count: '', campaign_id: '' })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/marketing/email', {
        subject: form.subject,
        content: form.content,
        recipients_count: form.recipients_count ? Number(form.recipients_count) : 0,
        campaign_id: form.campaign_id || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] })
      toast.success('Email campaign created')
      setForm({ subject: '', content: '', recipients_count: '', campaign_id: '' })
      onClose()
    },
    onError: () => toast.error('Could not create email campaign'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="New Email Campaign" description="Draft an email to send to your audience.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
      >
        <div>
          <Label htmlFor="subject">Subject *</Label>
          <Input id="subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="content">Content *</Label>
          <Textarea id="content" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="recipients_count">Recipients</Label>
            <Input id="recipients_count" type="number" min={0} value={form.recipients_count} onChange={(e) => setForm({ ...form, recipients_count: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="campaign_id">Campaign</Label>
            <Select id="campaign_id" value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}>
              <option value="">None</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Create Email Campaign</Button>
        </div>
      </form>
    </Dialog>
  )
}
