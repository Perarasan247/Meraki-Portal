import * as React from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import type { Profile } from '@/lib/types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  viewingBranchId: string | null
  setViewingBranchId: (branchId: string | null) => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | undefined>(undefined)

// UI-preview-only escape hatch: set VITE_DEV_BYPASS_AUTH=true to browse the
// whole app with a mocked Super Admin profile and no real Supabase/backend.
// Never enable this in a deployed build.
const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

const MOCK_PROFILE: Profile = {
  id: 'dev-preview-user',
  branch_id: null,
  full_name: 'Preview Admin',
  email: 'preview@meraki.local',
  mobile: '9999999999',
  role: 'super_admin',
  modules: [
    'enquiry', 'enrollment', 'batch_management', 'batch_execution',
    'curriculum', 'expense', 'marketing', 'reports', 'user_management', 'my_account',
  ],
  permission_level: 'Full Access',
  last_login: new Date().toISOString(),
  registered_at: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(DEV_BYPASS_AUTH ? MOCK_PROFILE : null)
  const [loading, setLoading] = React.useState(!DEV_BYPASS_AUTH)
  const [viewingBranchId, setViewingBranchId] = React.useState<string | null>(null)

  const loadProfile = React.useCallback(async () => {
    try {
      const data = await api.get<Profile>('/account/profile')
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }, [])

  React.useEffect(() => {
    if (DEV_BYPASS_AUTH) return
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session)
        if (data.session) await loadProfile()
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        await loadProfile()
      } else {
        setProfile(null)
        setViewingBranchId(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value: AuthState = {
    session,
    profile,
    loading,
    viewingBranchId,
    setViewingBranchId,
    signOut,
    refreshProfile: loadProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
