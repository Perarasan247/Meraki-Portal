import * as React from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRound, MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function ForgotPassword() {
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    // Always show the same confirmation, whether or not the email exists, so we
    // never reveal which addresses have accounts.
    if (error && error.status && error.status >= 500) {
      toast.error('Could not send the reset email. Please try again later.')
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 via-(--color-background) to-(--color-background) px-4 dark:from-emerald-950/30">
      <Card className="w-full max-w-sm p-8">
        {sent ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-(--color-accent) text-(--color-accent-foreground)">
              <MailCheck className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-(--color-muted-foreground)">
              If an account exists for <span className="font-medium text-(--color-foreground)">{email}</span>,
              a password reset link is on its way. The link opens a page where you can set a new password.
            </p>
            <Link to="/login" className="mt-6 text-sm text-(--color-primary) hover:underline">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-(--color-primary) text-(--color-primary-foreground)">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="font-display text-xl font-bold">Reset your password</h1>
              <p className="mt-1 text-sm text-(--color-muted-foreground)">
                Enter your account email and we'll send you a reset link.
              </p>
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
              <Button type="submit" className="w-full" loading={loading}>
                Send reset link
              </Button>
            </form>
            <Link
              to="/login"
              className="mt-6 block text-center text-sm text-(--color-muted-foreground) hover:text-(--color-primary)"
            >
              ← Back to sign in
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}
