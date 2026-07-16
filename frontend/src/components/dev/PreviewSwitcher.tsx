import { NavLink, useLocation } from 'react-router-dom'
import { Globe, LayoutDashboard, GraduationCap, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

const TARGETS = [
  { to: '/', label: 'Public', icon: Globe, end: true },
  { to: '/app', label: 'Admin', icon: LayoutDashboard, end: false },
  { to: '/learn', label: 'Student', icon: GraduationCap, end: false },
]

const ROLES = [
  { key: 'super_admin', label: 'Super Admin', icon: ShieldCheck },
  { key: 'trainer', label: 'Trainer', icon: GraduationCap },
] as const

function currentPreviewRole(): 'super_admin' | 'trainer' {
  return typeof localStorage !== 'undefined' && localStorage.getItem('meraki-preview-role') === 'trainer'
    ? 'trainer'
    : 'super_admin'
}

function setPreviewRole(role: 'super_admin' | 'trainer') {
  if (role === currentPreviewRole()) return
  if (role === 'trainer') localStorage.setItem('meraki-preview-role', 'trainer')
  else localStorage.removeItem('meraki-preview-role')
  // Re-init auth with the chosen mock profile (hash route is preserved).
  window.location.reload()
}

/**
 * Floating preview switcher shown ONLY in UI-preview mode
 * (VITE_DEV_BYPASS_AUTH=true). Jumps between Public / Admin / Student, and — in
 * the admin portal — lets you view it as a Super Admin or a Trainer (trimmed
 * access). Renders nothing in real builds.
 */
export function PreviewSwitcher() {
  const location = useLocation()
  if (!DEV_BYPASS_AUTH) return null
  const inAdmin = location.pathname.startsWith('/app')
  const previewRole = currentPreviewRole()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-1.5">
      {inAdmin && (
        <div className="flex items-center gap-1 rounded-full border border-(--color-border) bg-(--color-card)/95 p-1 shadow-lg backdrop-blur">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
            View as
          </span>
          {ROLES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreviewRole(key)}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                previewRole === key
                  ? 'bg-(--color-primary) text-(--color-primary-foreground)'
                  : 'text-(--color-foreground) hover:bg-(--color-muted)',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 rounded-full border border-(--color-border) bg-(--color-card)/95 p-1 shadow-lg backdrop-blur">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
          Preview
        </span>
        {TARGETS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-(--color-primary) text-(--color-primary-foreground)'
                  : 'text-(--color-foreground) hover:bg-(--color-muted)',
              )
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
