import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ShieldCheck, GraduationCap, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { api, ApiError } from '@/lib/api'
import { roleFromSession } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { MerakiLogo } from '@/components/MerakiLogo'
import { cn } from '@/lib/utils'

type LoginMode = 'admin' | 'student'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = React.useState<LoginMode>('admin')
  const [identifier, setIdentifier] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Students may sign in with a username; resolve it to the login email
      // first. Emails pass straight through.
      let email = identifier.trim()
      if (!email.includes('@')) {
        try {
          const resolved = await api.post<{ email: string }>('/auth/resolve-identifier', {
            identifier: email,
          })
          email = resolved.email
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            toast.error('Invalid username or password')
            return
          }
          throw err
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message)
        return
      }
      // Route to the correct portal based on the account's role claim.
      const role = roleFromSession(data.session)
      navigate(role === 'student' ? '/learn' : '/app', { replace: true })
    } catch {
      toast.error('Could not sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 via-(--color-background) to-(--color-background) px-4 dark:from-emerald-950/30">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <MerakiLogo className="mb-3 h-12 w-auto" />
          <h1 className="font-display text-xl font-bold">Meraki Portal</h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">
            {mode === 'student' ? 'Sign in to the student portal' : 'Sign in to the admin portal'}
          </p>
        </div>

        {/* Student / Admin selector */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-(--color-border) bg-(--color-muted) p-1">
          {(['admin', 'student'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                mode === m
                  ? 'bg-(--color-card) text-(--color-foreground) shadow-sm'
                  : 'text-(--color-muted-foreground) hover:text-(--color-foreground)',
              )}
              aria-pressed={mode === m}
            >
              {m === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
              {m === 'admin' ? 'Admin' : 'Student'}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="identifier">{mode === 'student' ? 'Email or Username' : 'Email'}</Label>
            <Input
              id="identifier"
              type={mode === 'admin' ? 'email' : 'text'}
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={mode === 'student' ? 'username or you@example.com' : 'you@meraki.com'}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="password" className="mb-0">Password</Label>
              <Link to="/forgot-password" className="text-xs text-(--color-primary) hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-(--color-muted-foreground) hover:text-(--color-foreground)"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
        <Link
          to="/"
          className="mt-6 block text-center text-sm text-(--color-muted-foreground) hover:text-(--color-primary)"
        >
          ← Back to website
        </Link>
      </Card>
    </div>
  )
}
