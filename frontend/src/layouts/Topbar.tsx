import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Menu, ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface BranchOption {
  id: string
  name: string
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile, viewingBranchId, setViewingBranchId, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [branchMenuOpen, setBranchMenuOpen] = React.useState(false)

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<BranchOption[]>('/branches'),
    enabled: profile?.role === 'super_admin',
  })

  const activeBranchName = viewingBranchId
    ? branches?.find((b) => b.id === viewingBranchId)?.name
    : 'All Branches'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-(--color-border) bg-(--color-card)/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="cursor-pointer rounded-md p-2 hover:bg-(--color-muted) lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        {profile?.role === 'super_admin' && (
          <div className="relative">
            <button
              onClick={() => setBranchMenuOpen((v) => !v)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-sm font-medium hover:bg-(--color-muted)"
            >
              {activeBranchName ?? 'All Branches'}
              <ChevronDown className="h-3.5 w-3.5 text-(--color-muted-foreground)" />
            </button>
            {branchMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setBranchMenuOpen(false)} />
                <div className="absolute left-0 z-20 mt-1 w-56 rounded-lg border border-(--color-border) bg-(--color-card) py-1 shadow-lg">
                  <button
                    className={cn(
                      'block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-(--color-muted)',
                      !viewingBranchId && 'text-(--color-primary) font-medium',
                    )}
                    onClick={() => {
                      setViewingBranchId(null)
                      setBranchMenuOpen(false)
                    }}
                  >
                    All Branches
                  </button>
                  {branches?.map((b) => (
                    <button
                      key={b.id}
                      className={cn(
                        'block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-(--color-muted)',
                        viewingBranchId === b.id && 'text-(--color-primary) font-medium',
                      )}
                      onClick={() => {
                        setViewingBranchId(b.id)
                        setBranchMenuOpen(false)
                      }}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-(--color-muted)"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-foreground)">
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="hidden text-sm font-medium sm:inline">{profile?.full_name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-(--color-muted-foreground)" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-(--color-border) bg-(--color-card) py-1 shadow-lg">
                <button
                  onClick={signOut}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-(--color-destructive) hover:bg-(--color-muted)"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
