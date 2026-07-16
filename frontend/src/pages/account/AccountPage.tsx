import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserCircle, Download, Upload, DatabaseBackup, ShieldCheck, AlertTriangle } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { StatCardSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { cn, formatDate } from '@/lib/utils'
import { MODULE_META } from '@/lib/types'
import type { BackupCounts, RestoreResult, Profile, UserRole, ModuleKey, ManagedUser } from '@/lib/types'

const ROLE_VARIANT: Record<UserRole, React.ComponentProps<typeof Badge>['variant']> = {
  super_admin: 'primary',
  branch_admin: 'info',
  trainer: 'warning',
  staff: 'success',
  custom: 'default',
}

function initials(name?: string | null): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function AccountPage() {
  const { profile: authProfile } = useAuth()
  const { data: profile } = useQuery({
    queryKey: ['account-profile'],
    queryFn: () => api.get<Profile>('/account/profile'),
    initialData: authProfile ?? undefined,
  })

  const roleLabel = profile?.role ? profile.role.replace('_', ' ') : '—'

  return (
    <div className="space-y-6">
      <PageHeader title="My Account" subtitle="Profile & preferences" icon={UserCircle} />

      {/* Profile identity summary */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-center">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-(--color-sidebar-active) font-display text-xl font-bold text-(--color-primary)"
            aria-hidden="true"
          >
            {initials(profile?.full_name)}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="font-display text-xl font-bold leading-tight text-(--color-foreground)">
              {profile?.full_name ?? '—'}
            </h2>
            <p className="mt-0.5 truncate text-sm text-(--color-muted-foreground)">{profile?.email ?? '—'}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {profile?.role && (
                <Badge variant={ROLE_VARIANT[profile.role]} className="capitalize">
                  {roleLabel}
                </Badge>
              )}
              {profile?.branch_id && (
                <span className="text-xs text-(--color-muted-foreground)">Branch: {profile.branch_id}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile information</CardTitle>
          <CardDescription>Your account identity as it appears across the portal.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-(--color-border)">
          <SettingRow label="Full name" value={profile?.full_name} />
          <SettingRow label="Email" value={profile?.email} />
          <SettingRow label="Mobile" value={profile?.mobile ?? '—'} />
          <SettingRow label="User ID" value={profile?.id} mono />
          <SettingRow label="Registered" value={profile?.registered_at ? formatDate(profile.registered_at) : '—'} />
          <SettingRow label="Last login" value={profile?.last_login ? formatDate(profile.last_login) : 'Never'} />
        </CardContent>
      </Card>

      {/* Access & role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-(--color-primary)" /> Access & role
          </CardTitle>
          <CardDescription>Modules you can access are managed by an administrator.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-(--color-border)">
          <SettingRow label="Role">
            {profile?.role ? (
              <Badge variant={ROLE_VARIANT[profile.role]} className="capitalize">
                {roleLabel}
              </Badge>
            ) : (
              <span className="text-sm text-(--color-muted-foreground)">—</span>
            )}
          </SettingRow>
          <SettingRow label="Permission level" value={profile?.permission_level} className="capitalize" />
          <SettingRow label="Modules">
            {profile?.modules?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.modules.map((m: ModuleKey) => (
                  <Badge key={m} variant="default">
                    {MODULE_META[m]?.label ?? m}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-(--color-muted-foreground)">No modules assigned</span>
            )}
          </SettingRow>
        </CardContent>
      </Card>

      {profile?.role === 'super_admin' && <TransferSuperAdminSection />}

      <BackupSection />
      <RestoreSection />
    </div>
  )
}

function TransferSuperAdminSection() {
  const { signOut } = useAuth()
  const [targetId, setTargetId] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<ManagedUser[]>('/users'),
  })
  const eligible = (users ?? []).filter((u) => u.is_active && u.role !== 'super_admin')
  const target = eligible.find((u) => u.id === targetId) ?? null

  const transfer = useMutation({
    mutationFn: () => api.post(`/users/${targetId}/transfer-super-admin`),
    onSuccess: async () => {
      setConfirmOpen(false)
      toast.success('Super admin transferred — signing you out…')
      // Force a fresh token so the demotion (branch admin) takes effect.
      setTimeout(() => { void signOut() }, 800)
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not transfer super admin'),
  })

  return (
    <Card className="border-amber-300 dark:border-amber-500/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" /> Transfer Super Admin
        </CardTitle>
        <CardDescription>
          Hand over super admin to another user. <span className="font-medium text-(--color-foreground)">You will
          become a normal (branch) admin</span> and lose super admin access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label htmlFor="transfer-target" className="mb-1.5 block text-sm font-medium">Promote this user to Super Admin</label>
          <Select id="transfer-target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">Select a user…</option>
            {eligible.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} · {u.email} ({u.role.replace('_', ' ')})
              </option>
            ))}
          </Select>
          {eligible.length === 0 && (
            <p className="mt-1 text-xs text-(--color-muted-foreground)">
              No eligible users. Create a branch admin first, then transfer.
            </p>
          )}
        </div>
        <Button variant="destructive" disabled={!targetId} onClick={() => setConfirmOpen(true)}>
          <AlertTriangle className="h-4 w-4" /> Transfer Super Admin
        </Button>
      </CardContent>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Transfer Super Admin?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" loading={transfer.isPending} onClick={() => transfer.mutate()}>
              Yes, transfer &amp; step down
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-(--color-foreground)">
            If you give Super Admin to <span className="font-semibold">{target?.full_name ?? 'this user'}</span>, you
            will <span className="font-semibold">lose your Super Admin status and become a normal (branch) admin</span>.
            You’ll be signed out and must log back in. Only the new Super Admin can undo this.
          </p>
        </div>
      </Dialog>
    </Card>
  )
}

/**
 * Two-column labeled settings row: label on the left, read-only value or a
 * custom control on the right. Stacks vertically on mobile.
 */
function SettingRow({
  label,
  value,
  mono,
  className,
  children,
}: {
  label: string
  value?: string | null
  mono?: boolean
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-center sm:gap-4">
      <p className="text-sm font-medium text-(--color-foreground)">{label}</p>
      <div className="min-w-0">
        {children ?? (
          <p className={cn('truncate text-sm text-(--color-muted-foreground)', mono && 'font-mono', className)}>
            {value ?? '—'}
          </p>
        )}
      </div>
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
      <CardHeader>
        <CardTitle>Data backup</CardTitle>
        <CardDescription>
          Export a full JSON snapshot of your actual database records — enquiries, enrollments, batches, expenses, and
          curricula.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <Button className="cursor-pointer" onClick={handleDownload}>
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
      <CardHeader>
        <CardTitle>Restore from backup</CardTitle>
        <CardDescription>
          Restore your records from a previously downloaded backup file. Records are re-stamped to your branch on
          restore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
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
              <Button className="cursor-pointer" loading={restoreMutation.isPending} onClick={handleConfirm}>
                Confirm Restore
              </Button>
              <Button variant="ghost" className="cursor-pointer" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-(--color-border) p-3 text-sm">
            <p className="font-medium">Restored:</p>
            <ul className="mt-1 space-y-0.5 text-(--color-muted-foreground)">
              {Object.entries(result.restored).map(([table, count]) => (
                <li key={table}>
                  {table}: {count}
                </li>
              ))}
            </ul>
            {result.errors.length > 0 && (
              <>
                <p className="mt-2 font-medium text-(--color-destructive)">Errors:</p>
                <ul className="mt-1 space-y-0.5 text-(--color-muted-foreground)">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
