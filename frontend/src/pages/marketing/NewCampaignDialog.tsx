import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import type { CampaignType } from '@/lib/types'

const TYPES: CampaignType[] = ['Email', 'WhatsApp', 'General']

export function NewCampaignDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    name: '', type: 'General' as CampaignType, target_audience: '', budget: '', program: '',
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/marketing/campaigns', {
        name: form.name,
        type: form.type,
        target_audience: form.target_audience || null,
        program: form.program || null,
        budget: form.budget ? Number(form.budget) : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign created')
      setForm({ name: '', type: 'General', target_audience: '', budget: '', program: '' })
      onClose()
    },
    onError: () => toast.error('Could not create campaign'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="New Campaign" description="Set up a marketing campaign.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
      >
        <div>
          <Label htmlFor="name">Campaign Name *</Label>
          <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="type">Type</Label>
            <Select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CampaignType })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="budget">Budget</Label>
            <Input id="budget" type="number" min={0} step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="target_audience">Target Audience</Label>
            <Input id="target_audience" value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="program">Program</Label>
            <Input id="program" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Create Campaign</Button>
        </div>
      </form>
    </Dialog>
  )
}
