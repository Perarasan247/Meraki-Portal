import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    // Supabase parses the recovery token from the URL and emits a session.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Password updated. Please sign in.')
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 via-(--color-background) to-(--color-background) px-4 dark:from-emerald-950/30">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-(--color-primary) text-(--color-primary-foreground)">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-bold">Set a new password</h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">
            {ready ? 'Choose a new password for your account.' : 'Validating your reset link…'}
          </p>
        </div>
        {ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Update password
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-(--color-muted-foreground)">
            If this page doesn't unlock, request a new link from{' '}
            <Link to="/forgot-password" className="text-(--color-primary) hover:underline">
              forgot password
            </Link>
            .
          </p>
        )}
      </Card>
    </div>
  )
}
