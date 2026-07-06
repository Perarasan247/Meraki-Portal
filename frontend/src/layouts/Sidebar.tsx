import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, MessagesSquare, GraduationCap, CalendarRange, ListChecks,
  BookOpen, Wallet, Megaphone, Sparkles, Users, UserCircle, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { MODULE_META, type ModuleKey } from '@/lib/types'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, MessagesSquare, GraduationCap, CalendarRange, ListChecks,
  BookOpen, Wallet, Megaphone, Sparkles, Users, UserCircle,
}

const NAV_ORDER: ModuleKey[] = [
  'dashboard', 'enquiry', 'enrollment', 'batch_management', 'batch_execution',
  'curriculum', 'expense', 'marketing', 'reports', 'user_management', 'my_account',
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { profile } = useAuth()
  if (!profile) return null

  const isSuperAdmin = profile.role === 'super_admin'
  const visibleModules = NAV_ORDER.filter((m) => {
    if (m === 'my_account') return true
    if (m === 'dashboard') return true
    if (m === 'user_management') return isSuperAdmin || profile.role === 'branch_admin'
    return isSuperAdmin || profile.modules.includes(m)
  })

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 shrink-0 transform border-r border-(--color-border) bg-(--color-sidebar) transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-(--color-border) px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary) text-(--color-primary-foreground)">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display text-base font-bold text-(--color-foreground)">Meraki</span>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1 hover:bg-(--color-muted) lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visibleModules.map((key) => {
            const meta = MODULE_META[key]
            const Icon = ICONS[meta.icon]
            return (
              <NavLink
                key={key}
                to={meta.path}
                end={meta.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-(--color-sidebar-foreground) transition-colors',
                    isActive
                      ? 'bg-(--color-sidebar-active) text-(--color-primary)'
                      : 'hover:bg-(--color-muted)',
                  )
                }
              >
                <Icon className="h-4.5 w-4.5" />
                {meta.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
