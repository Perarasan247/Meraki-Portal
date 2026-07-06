import { useAuth } from '@/context/AuthContext'
import type { ModuleKey } from '@/lib/types'

export function useModuleAccess(module: ModuleKey): boolean {
  const { profile } = useAuth()
  if (!profile) return false
  if (profile.role === 'super_admin') return true
  return profile.modules.includes(module)
}

export function useBranchQueryParam(): string {
  const { profile, viewingBranchId } = useAuth()
  if (profile?.role === 'super_admin') {
    return viewingBranchId ? `branch_id=${viewingBranchId}` : ''
  }
  return ''
}
