import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { MODULE_META, type ModuleKey } from '@/lib/types'

// Dashboard pulls in the charting lib — keep it in its own chunk. It renders
// under AppLayout's Suspense boundary.
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))

// Modules in sidebar order, excluding dashboard/my_account, for picking a
// landing page for accounts that don't have the dashboard.
const MODULE_ORDER: ModuleKey[] = [
  'enquiry', 'enrollment', 'batch_management', 'batch_execution',
  'curriculum', 'expense', 'student_management', 'user_management',
]

/** The `/app` index. Dashboard for staff/admins; trainers (no dashboard access)
 * are sent to their first available module instead. */
export function AppIndex() {
  const { profile } = useAuth()
  if (!profile) return null

  if (profile.role === 'trainer') {
    const first = MODULE_ORDER.find((m) => profile.modules.includes(m))
    return <Navigate to={first ? MODULE_META[first].path : '/app/account'} replace />
  }

  return <DashboardPage />
}
