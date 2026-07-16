import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

/**
 * Gates a portal. `expect` enforces which kind of account may enter:
 *   - 'staff'   → the admin portal (/app). Students are bounced to /learn.
 *   - 'student' → the student portal (/learn). Staff are bounced to /app.
 * This is the deep-link guard: it stops one portal's users from reaching the
 * other's routes by typing the URL.
 */
export function ProtectedRoute({
  children,
  expect,
}: {
  children: React.ReactNode
  expect?: 'staff' | 'student'
}) {
  const { session, loading, role } = useAuth()

  if (DEV_BYPASS_AUTH) return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (expect === 'student' && role !== 'student') return <Navigate to="/app" replace />
  if (expect === 'staff' && role === 'student') return <Navigate to="/learn" replace />

  return <>{children}</>
}

export function ModuleGuard({
  allowed,
  children,
}: {
  allowed: boolean
  children: React.ReactNode
}) {
  if (!allowed) return <Navigate to="/" replace />
  return <>{children}</>
}
