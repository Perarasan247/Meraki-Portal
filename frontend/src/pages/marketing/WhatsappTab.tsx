import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MessageCircle, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { WhatsappBlast, Campaign } from '@/lib/types'

export function WhatsappTab({ whatsappBlasts, campaigns, isLoading }: { whatsappBlasts: WhatsappBlast[]; campaigns: Campaign[]; isLoading: boolean }) {
  const [formOpen, setFormOpen] = React.useState(false)
  const queryClient = useQueryClient()

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/marketing/whatsapp/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-blasts'] })
      toast.success('WhatsApp blast sent (mock)')
    },
    onError: () => toast.error('Could not send WhatsApp blast'),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New WhatsApp Blast
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>WhatsApp Blasts</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : whatsappBlasts.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No WhatsApp blasts yet" description="Create one to start reaching your audience." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whatsappBlasts.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="max-w-xs truncate font-medium">{b.content}</TableCell>
                    <TableCell>{b.recipients_count}</TableCell>
                    <TableCell>{b.delivered_count}</TableCell>
                    <TableCell>{b.sent_at ? formatDate(b.sent_at) : '—'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!b.sent_at}
                        loading={sendMutation.isPending}
                        onClick={() => sendMutation.mutate(b.id)}
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

      <NewWhatsappBlastDialog open={formOpen} onClose={() => setFormOpen(false)} campaigns={campaigns} />
    </div>
  )
}

function NewWhatsappBlastDialog({ open, onClose, campaigns }: { open: boolean; onClose: () => void; campaigns: Campaign[] }) {
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({ content: '', recipients_count: '', campaign_id: '' })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/marketing/whatsapp', {
        content: form.content,
        recipients_count: form.recipients_count ? Number(form.recipients_count) : 0,
        campaign_id: form.campaign_id || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-blasts'] })
      toast.success('WhatsApp blast created')
      setForm({ content: '', recipients_count: '', campaign_id: '' })
      onClose()
    },
    onError: () => toast.error('Could not create WhatsApp blast'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="New WhatsApp Blast" description="Draft a message to send to your audience.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
      >
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
          <Button type="submit" loading={createMutation.isPending}>Create Blast</Button>
        </div>
      </form>
    </Dialog>
  )
}
