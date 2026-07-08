import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    navigate('/app', { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-50 via-(--color-background) to-(--color-background) px-4 dark:from-indigo-950/30">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-(--color-primary) text-(--color-primary-foreground)">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-bold">Meraki Portal</h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">Sign in to your branch or admin account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@meraki.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
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
