import * as React from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, UserCircle, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export default function StudentAccountPage() {
  const { student } = useAuth()
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return toast.error('Passwords do not match')
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success('Password updated')
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/learn" className="rounded-md p-1.5 hover:bg-(--color-muted)">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-xl font-bold">My Account</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-4.5 w-4.5" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={student?.full_name} />
          <Field label="Email" value={student?.email} />
          <Field label="Username" value={student?.username ?? '—'} />
          <Field label="Mobile" value={student?.mobile ?? '—'} />
          <div>
            <p className="text-xs font-medium text-(--color-muted-foreground)">Internship Domain</p>
            <div className="mt-1">
              {student?.domain_label ? <Badge variant="primary">{student.domain_label}</Badge> : '—'}
            </div>
          </div>
          <Field
            label="Account expiry"
            value={student?.account_expiry ? formatDate(student.account_expiry) : 'Never'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4.5 w-4.5" /> Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <Label htmlFor="np">New password</Label>
              <Input id="np" type="password" autoComplete="new-password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <Label htmlFor="cp">Confirm password</Label>
              <Input id="cp" type="password" autoComplete="new-password" required minLength={8}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>Update password</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-(--color-muted-foreground)">{label}</p>
      <p className="mt-1 text-sm font-medium text-(--color-foreground)">{value ?? '—'}</p>
    </div>
  )
}
