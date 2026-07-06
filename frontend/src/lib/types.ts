export type UserRole = 'super_admin' | 'branch_admin' | 'staff' | 'custom'

export type ModuleKey =
  | 'dashboard'
  | 'enquiry'
  | 'enrollment'
  | 'batch_management'
  | 'batch_execution'
  | 'curriculum'
  | 'expense'
  | 'marketing'
  | 'reports'
  | 'user_management'
  | 'my_account'

export interface Profile {
  id: string
  branch_id: string | null
  full_name: string
  email: string
  mobile: string | null
  role: UserRole
  modules: ModuleKey[]
  permission_level: string
  last_login: string | null
  registered_at: string
}

export interface Branch {
  id: string
  name: string
  address: string | null
}

export type EnquiryStatus = 'New' | 'Contacted' | 'Interested' | 'Converted'

export interface Enquiry {
  id: string
  branch_id: string
  student_name: string
  mobile: string
  program: string
  year_of_study: string | null
  reference_source: string | null
  status: EnquiryStatus
  notes: string | null
  created_at: string
  converted_enrollment_id: string | null
}

export type FeeStatus = 'Paid' | 'Partial' | 'Pending'

export interface Enrollment {
  id: string
  branch_id: string
  student_name: string
  mobile: string
  program: string
  year_of_study: string | null
  batch_id: string | null
  total_fee: number
  paid_amount: number
  pending_amount: number
  fee_status: FeeStatus
  created_at: string
}

export type BatchMode = 'Online' | 'Offline' | 'Hybrid'
export type BatchStatus = 'Upcoming' | 'Active' | 'Completed'

export interface Batch {
  id: string
  branch_id: string
  batch_name: string
  program: string
  trainer: string | null
  start_date: string | null
  end_date: string | null
  seats_total: number
  seats_filled: number
  mode: BatchMode
  status: BatchStatus
  created_at: string
}

export type CurriculumStatus = 'Draft' | 'Published'

export interface CurriculumPhase {
  id: string
  title: string
  description: string
  order: number
  estimated_duration: string | null
}

export interface Curriculum {
  id: string
  branch_id: string
  program: string
  title: string
  status: CurriculumStatus
  phases: CurriculumPhase[]
  created_at: string
}

export type ExpenseStatus = 'Pending' | 'Approved'

export interface Expense {
  id: string
  branch_id: string
  title: string
  category: string
  amount: number
  vendor: string | null
  date: string
  notes: string | null
  status: ExpenseStatus
  created_at: string
}

export type CampaignType = 'Email' | 'WhatsApp' | 'General'
export type CampaignStatus = 'Draft' | 'Active' | 'Completed'

export interface Campaign {
  id: string
  branch_id: string
  name: string
  type: CampaignType
  target_audience: string | null
  program: string | null
  budget: number | null
  leads_generated: number
  status: CampaignStatus
  created_at: string
}

export interface EmailCampaign {
  id: string
  branch_id: string
  campaign_id: string | null
  subject: string
  content: string
  recipients_count: number
  sent_at: string | null
  delivered_count: number
  created_at: string
}

export interface WhatsappBlast {
  id: string
  branch_id: string
  campaign_id: string | null
  content: string
  recipients_count: number
  sent_at: string | null
  delivered_count: number
  created_at: string
}

export interface LeadSourceAggregate {
  source_name: string
  count: number
}

export interface ManagedUser extends Profile {
  is_active: boolean
}

export interface BackupCounts {
  branch_id: string | null
  enquiries: number
  enrollments: number
  batches: number
  expenses: number
  curricula: number
}

export interface RestoreResult {
  restored: Record<string, number>
  errors: string[]
}

export const MODULE_META: Record<
  ModuleKey,
  { label: string; icon: string; path: string }
> = {
  dashboard: { label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  enquiry: { label: 'Enquiry', icon: 'MessagesSquare', path: '/enquiry' },
  enrollment: { label: 'Enrollment', icon: 'GraduationCap', path: '/enrollment' },
  batch_management: { label: 'Batch Management', icon: 'CalendarRange', path: '/batches' },
  batch_execution: { label: 'Batch Execution', icon: 'ListChecks', path: '/batch-execution' },
  curriculum: { label: 'Curriculum', icon: 'BookOpen', path: '/curriculum' },
  expense: { label: 'Finance', icon: 'Wallet', path: '/expenses' },
  marketing: { label: 'Marketing Hub', icon: 'Megaphone', path: '/marketing' },
  reports: { label: 'AI Reports', icon: 'Sparkles', path: '/reports' },
  user_management: { label: 'User Management', icon: 'Users', path: '/users' },
  my_account: { label: 'My Account', icon: 'UserCircle', path: '/account' },
}
