import * as React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, UserCircle, BookOpen } from 'lucide-react'
import { MerakiLogo } from '@/components/MerakiLogo'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/PageLoader'

export default function StudentLayout() {
  const { student, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = React.useState(false)

  return (
    <div className="min-h-dvh bg-(--color-background)">
      <header className="sticky top-0 z-30 border-b border-(--color-border) bg-(--color-card)/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => navigate('/learn')} className="flex cursor-pointer items-center gap-2">
            <MerakiLogo className="h-7 w-auto" />
            <span className="font-display text-base font-bold">Meraki Learn</span>
          </button>

          <nav className="hidden items-center gap-1 sm:flex">
            <PortalLink to="/learn" end icon={BookOpen} label="My Learning" />
          </nav>

          <div className="flex items-center gap-2">
            {student?.domain_label && <Badge variant="primary">{student.domain_label}</Badge>}
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-(--color-muted)"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-foreground)">
                  {student?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="hidden text-sm font-medium sm:inline">{student?.full_name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-(--color-muted-foreground)" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-(--color-border) bg-(--color-card) py-1 shadow-lg">
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/learn/account') }}
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-(--color-muted)"
                    >
                      <UserCircle className="h-4 w-4" /> My Account
                    </button>
                    <button
                      onClick={signOut}
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-(--color-destructive) hover:bg-(--color-muted)"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <React.Suspense fallback={<PageLoader />}>
          <Outlet />
        </React.Suspense>
      </main>
    </div>
  )
}

function PortalLink({
  to, end, icon: Icon, label,
}: {
  to: string
  end?: boolean
  icon: typeof BookOpen
  label: string
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-(--color-sidebar-active) text-(--color-primary)' : 'hover:bg-(--color-muted)',
        )
      }
    >
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  )
}
