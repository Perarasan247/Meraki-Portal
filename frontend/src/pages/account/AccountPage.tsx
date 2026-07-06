import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserCircle, Download, Upload, DatabaseBackup } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { StatCardSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { BackupCounts, RestoreResult, Profile } from '@/lib/types'

export default function AccountPage() {
  const { profile: authProfile } = useAuth()
  const { data: profile } = useQuery({
    queryKey: ['account-profile'],
    queryFn: () => api.get<Profile>('/account/profile'),
    initialData: authProfile ?? undefined,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <UserCircle className="h-6 w-6 text-(--color-primary)" /> My Account
        </h1>
        <p className="mt-1 text-sm text-(--color-muted-foreground)">Your profile details and data backup tools.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" value={profile?.full_name} />
          <Field label="User ID" value={profile?.id} mono />
          <Field label="Email" value={profile?.email} />
          <Field label="Mobile" value={profile?.mobile ?? '—'} />
          <Field label="Role" value={profile?.role?.replace('_', ' ')} className="capitalize" />
          <Field label="Registered" value={profile?.registered_at ? formatDate(profile.registered_at) : '—'} />
          <Field label="Last Login" value={profile?.last_login ? formatDate(profile.last_login) : 'Never'} />
        </CardContent>
      </Card>

      <BackupSection />
      <RestoreSection />
    </div>
  )
}

function Field({ label, value, mono, className }: { label: string; value?: string | null; mono?: boolean; className?: string }) {
  return (
    <div>
      <p className="text-xs text-(--color-muted-foreground)">{label}</p>
      <p className={`mt-1 text-sm font-medium ${mono ? 'font-mono' : ''} ${className ?? ''}`}>{value ?? '—'}</p>
    </div>
  )
}

function BackupSection() {
  const { data: counts, isLoading } = useQuery({
    queryKey: ['backup-counts'],
    queryFn: () => api.get<BackupCounts>('/account/backup/counts'),
  })

  async function handleDownload() {
    try {
      const data = await api.get<Record<string, unknown>>('/account/backup/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meraki-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded')
    } catch {
      toast.error('Could not export backup')
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Data Backup</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-(--color-muted-foreground)">
          Export a full JSON snapshot of your actual database records — enquiries, enrollments, batches, expenses, and curricula.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard label="Enquiries" value={counts?.enquiries ?? 0} icon={DatabaseBackup} accent="primary" />
              <StatCard label="Enrollments" value={counts?.enrollments ?? 0} icon={DatabaseBackup} accent="accent" />
              <StatCard label="Batches" value={counts?.batches ?? 0} icon={DatabaseBackup} accent="warning" />
              <StatCard label="Expenses" value={counts?.expenses ?? 0} icon={DatabaseBackup} accent="danger" />
              <StatCard label="Curricula" value={counts?.curricula ?? 0} icon={DatabaseBackup} accent="primary" />
            </>
          )}
        </div>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4" /> Download Backup (.json)
        </Button>
      </CardContent>
    </Card>
  )
}

function RestoreSection() {
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [parsed, setParsed] = React.useState<Record<string, unknown> | null>(null)
  const [result, setResult] = React.useState<RestoreResult | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const restoreMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<RestoreResult>('/account/backup/restore', payload),
    onSuccess: (res) => {
      setResult(res)
      toast.success('Backup restored')
    },
    onError: () => toast.error('Restore failed'),
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      setParsed(json)
      setFileName(file.name)
    } catch {
      toast.error('That file is not valid JSON')
      setParsed(null)
      setFileName(null)
    }
  }

  const previewCounts = React.useMemo(() => {
    if (!parsed) return null
    const tables = ['enquiries', 'enrollments', 'batches', 'expenses', 'curricula']
    return tables.map((t) => [t, Array.isArray(parsed[t]) ? (parsed[t] as unknown[]).length : 0] as const)
  }, [parsed])

  function handleConfirm() {
    if (!parsed) return
    restoreMutation.mutate(parsed)
  }

  function handleReset() {
    setParsed(null)
    setFileName(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader><CardTitle>Restore from Backup</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-(--color-muted-foreground)">
          Restore your records from a previously downloaded backup file. Records are re-stamped to your branch on restore.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Choose Backup File
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          {fileName && <span className="text-sm text-(--color-muted-foreground)">{fileName}</span>}
        </div>

        {previewCounts && (
          <div className="space-y-3">
            <pre className="overflow-x-auto rounded-lg border border-(--color-border) bg-(--color-muted) p-3 text-xs">
              {previewCounts.map(([table, count]) => `${table}: ${count} row(s)\n`).join('')}
            </pre>
            <div className="flex gap-2">
              <Button loading={restoreMutation.isPending} onClick={handleConfirm}>Confirm Restore</Button>
              <Button variant="ghost" onClick={handleReset}>Cancel</Button>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-(--color-border) p-3 text-sm">
            <p className="font-medium">Restored:</p>
            <ul className="mt-1 space-y-0.5 text-(--color-muted-foreground)">
              {Object.entries(result.restored).map(([table, count]) => (
                <li key={table}>{table}: {count}</li>
              ))}
            </ul>
            {result.errors.length > 0 && (
              <>
                <p className="mt-2 font-medium text-(--color-destructive)">Errors:</p>
                <ul className="mt-1 space-y-0.5 text-(--color-muted-foreground)">
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
