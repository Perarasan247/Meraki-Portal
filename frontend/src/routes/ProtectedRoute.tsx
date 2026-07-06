import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (DEV_BYPASS_AUTH) return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

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
