import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, MessagesSquare, GraduationCap, CalendarRange, ListChecks,
  BookOpen, Wallet, Megaphone, Sparkles, Users, UserCircle, X, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { MerakiLogo } from '@/components/MerakiLogo'
import { MODULE_META, type ModuleKey } from '@/lib/types'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, MessagesSquare, GraduationCap, CalendarRange, ListChecks,
  BookOpen, Wallet, Megaphone, Sparkles, Users, UserCircle,
}

const NAV_ORDER: ModuleKey[] = [
  'dashboard', 'enquiry', 'enrollment', 'curriculum', 'batch_management',
  'batch_execution', 'expense', 'student_management', 'user_management', 'my_account',
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { profile, signOut } = useAuth()
  if (!profile) return null

  const isSuperAdmin = profile.role === 'super_admin'
  const isTrainer = profile.role === 'trainer'
  const visibleModules = NAV_ORDER.filter((m) => {
    if (m === 'my_account') return true
    if (isSuperAdmin) return true
    // Trainers see only the modules explicitly granted to them (no dashboard).
    if (isTrainer) return profile.modules.includes(m)
    if (m === 'dashboard') return true
    if (m === 'user_management') return profile.role === 'branch_admin'
    if (m === 'student_management') return profile.role === 'branch_admin'
    return profile.modules.includes(m)
  })

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          // flex column so the nav scrolls and Sign out stays pinned below it.
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 transform flex-col border-r border-(--color-border) bg-(--color-sidebar) transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-(--color-border) px-5">
          <div className="flex items-center gap-2">
            <MerakiLogo className="h-7 w-auto" />
            <span className="font-display text-base font-bold text-(--color-foreground)">Meraki</span>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1 hover:bg-(--color-muted) lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {visibleModules.map((key) => {
            const meta = MODULE_META[key]
            const Icon = ICONS[meta.icon]
            return (
              <NavLink
                key={key}
                to={meta.path}
                end={meta.path === '/app'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-(--color-sidebar-active) font-semibold text-(--color-primary)'
                      : 'text-(--color-sidebar-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground)',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-(--color-primary)" aria-hidden />
                    )}
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {meta.label}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Sits under the menu, separated so it never reads as a nav item. */}
        <div className="border-t border-(--color-border) p-3">
          <button
            onClick={signOut}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-(--color-destructive) transition-colors hover:bg-(--color-destructive)/10"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
