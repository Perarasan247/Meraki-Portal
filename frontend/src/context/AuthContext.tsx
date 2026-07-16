import * as React from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import type { AppRole, Profile, StudentIdentity } from '@/lib/types'
import { TRAINER_MODULES } from '@/lib/types'

interface AuthState {
  session: Session | null
  role: AppRole | null
  profile: Profile | null
  student: StudentIdentity | null
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

// Preview lets you view the admin portal as a Super Admin or a Trainer
// (set via the on-screen Preview switcher, stored in localStorage).
const PREVIEW_ROLE: 'super_admin' | 'trainer' =
  typeof localStorage !== 'undefined' && localStorage.getItem('meraki-preview-role') === 'trainer'
    ? 'trainer'
    : 'super_admin'

const MOCK_PROFILE: Profile =
  PREVIEW_ROLE === 'trainer'
    ? {
        id: 'dev-preview-trainer',
        branch_id: 'dev-branch',
        full_name: 'Ravi Kumar (Trainer)',
        email: 'ravi@meraki.local',
        mobile: '9840022222',
        role: 'trainer',
        modules: [...TRAINER_MODULES],
        permission_level: 'custom',
        last_login: new Date().toISOString(),
        registered_at: new Date().toISOString(),
      }
    : {
        id: 'dev-preview-user',
        branch_id: null,
        full_name: 'Super Admin (Chennai)',
        email: 'admin@meraki.local',
        mobile: '9999999999',
        role: 'super_admin',
        modules: [
          'dashboard', 'enquiry', 'enrollment', 'batch_management', 'batch_execution',
          'curriculum', 'expense', 'student_management', 'user_management', 'my_account',
        ],
        permission_level: 'Full Access',
        last_login: new Date().toISOString(),
        registered_at: new Date().toISOString(),
      }

// Preview identity for the student portal (paired with the sample LMS data).
const MOCK_STUDENT: StudentIdentity = {
  id: 'dev-preview-student',
  full_name: 'Aarav Sharma',
  email: 'aarav@student.meraki.local',
  username: 'aarav_ai',
  mobile: '9876543210',
  branch_id: 'dev-branch',
  domain_id: 'dev-domain',
  domain_key: 'genai',
  domain_label: 'Generative AI, LLMs & AI Agents',
  account_expiry: null,
  is_active: true,
}

/** Read the `user_role` custom claim straight off the access token. It's stamped by
 * the Supabase custom-access-token hook, so it's available the moment we have a
 * session — before the profile/student row round-trips. */
export function roleFromSession(session: Session | null): AppRole | null {
  const token = session?.access_token
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
    return (payload.user_role as AppRole) ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(DEV_BYPASS_AUTH ? MOCK_PROFILE : null)
  const [student, setStudent] = React.useState<StudentIdentity | null>(DEV_BYPASS_AUTH ? MOCK_STUDENT : null)
  const [loading, setLoading] = React.useState(!DEV_BYPASS_AUTH)
  const [viewingBranchId, setViewingBranchId] = React.useState<string | null>(null)

  const loadIdentity = React.useCallback(async (activeSession: Session | null) => {
    const role = roleFromSession(activeSession)
    try {
      if (role === 'student') {
        const data = await api.get<StudentIdentity>('/student/me')
        setStudent(data)
        setProfile(null)
      } else {
        const data = await api.get<Profile>('/account/profile')
        setProfile(data)
        setStudent(null)
      }
    } catch {
      setProfile(null)
      setStudent(null)
    }
  }, [])

  React.useEffect(() => {
    if (DEV_BYPASS_AUTH) return
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session)
        if (data.session) await loadIdentity(data.session)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        await loadIdentity(newSession)
      } else {
        setProfile(null)
        setStudent(null)
        setViewingBranchId(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [loadIdentity])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const role = DEV_BYPASS_AUTH ? PREVIEW_ROLE : roleFromSession(session)

  const value: AuthState = {
    session,
    role,
    profile,
    student,
    loading,
    viewingBranchId,
    setViewingBranchId,
    signOut,
    refreshProfile: () => loadIdentity(session),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
