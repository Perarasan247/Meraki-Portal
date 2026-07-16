export type UserRole = 'super_admin' | 'branch_admin' | 'trainer' | 'staff' | 'custom'

/** Modules a Trainer can access — a limited slice of the admin portal.
 * (Batch Management, Batch Execution, Curriculum, Students, My Account.) */
export const TRAINER_MODULES: ModuleKey[] = [
  'batch_management', 'batch_execution', 'curriculum', 'student_management', 'my_account',
]

/** All logged-in identities, including students (who live outside `profiles`). */
export type AppRole = UserRole | 'student'

export type ModuleKey =
  | 'dashboard'
  | 'enquiry'
  | 'enrollment'
  | 'batch_management'
  | 'batch_execution'
  | 'curriculum'
  | 'expense'
  | 'student_management'
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
  email: string | null
  mobile: string
  college: string | null
  program: string
  year_of_study: string | null
  reference_source: string | null
  campaign_id: string | null
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
  email: string | null
  college: string | null
  program: string
  year_of_study: string | null
  batch_id: string | null
  start_date: string | null
  end_date: string | null
  enrollment_date: string | null
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
  venue: string | null
  start_date: string | null
  end_date: string | null
  seats_total: number
  seats_filled: number
  mode: BatchMode
  status: BatchStatus
  created_at: string
}

export type CurriculumStatus = 'Draft' | 'Published'

/** Paginated list envelope returned by list endpoints when `page` is sent. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

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
  domain_id: string | null
  program: string
  title: string
  status: CurriculumStatus
  phases: CurriculumPhase[]
  created_at: string
}

// --- LMS (curriculum builder) ---
export type LessonBlockType = 'text' | 'video' | 'image'
export type QuizQuestionType = 'single_choice' | 'multi_choice' | 'true_false' | 'short_answer'

export interface LessonBlock {
  id: string
  lesson_id: string
  branch_id: string
  type: LessonBlockType
  order_index: number
  // text: { markdown }, video: { url, youtube_id?, caption? }, image: { url, caption? }
  content: Record<string, unknown>
  created_at: string
}

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  branch_id: string
  prompt: string
  type: QuizQuestionType
  order_index: number
  options: QuizOption[]
  correct: unknown[] // choice: optionId[]; true_false: [boolean]; short_answer: string[]
  points: number
  explanation: string | null
  created_at: string
}

export interface Quiz {
  id: string
  curriculum_id: string
  branch_id: string
  module_id: string | null
  lesson_id: string | null
  title: string
  pass_percentage: number
  max_attempts: number | null
  created_at: string
  questions: QuizQuestion[]
}

export interface LessonTree {
  id: string
  module_id: string
  branch_id: string
  title: string
  order_index: number
  estimated_minutes: number | null
  is_published: boolean
  created_at: string
  blocks: LessonBlock[]
  quiz: Quiz | null
}

export interface ModuleTree {
  id: string
  curriculum_id: string
  branch_id: string
  title: string
  description: string | null
  order_index: number
  is_published: boolean
  created_at: string
  lessons: LessonTree[]
  quiz: Quiz | null
}

export interface CurriculumContent {
  curriculum_id: string
  modules: ModuleTree[]
}

export type ExpenseStatus = 'Pending' | 'Approved'

export type PaymentMethod =
  | 'Cash' | 'UPI' | 'Debit Card' | 'Credit Card' | 'Bank Transfer' | 'Cheque' | 'Other'

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Cheque', 'Other',
]

export interface Expense {
  id: string
  branch_id: string
  title: string
  category: string
  amount: number
  vendor: string | null
  payment_method: PaymentMethod | null
  invoice_no: string | null
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
  dashboard: { label: 'Dashboard', icon: 'LayoutDashboard', path: '/app' },
  enquiry: { label: 'Enquiry', icon: 'MessagesSquare', path: '/app/enquiry' },
  enrollment: { label: 'Enrollment', icon: 'GraduationCap', path: '/app/enrollment' },
  batch_management: { label: 'Batch Management', icon: 'CalendarRange', path: '/app/batches' },
  batch_execution: { label: 'Batch Execution', icon: 'ListChecks', path: '/app/batch-execution' },
  curriculum: { label: 'Curriculum', icon: 'BookOpen', path: '/app/curriculum' },
  expense: { label: 'Finance', icon: 'Wallet', path: '/app/expenses' },
  student_management: { label: 'Students', icon: 'GraduationCap', path: '/app/students' },
  user_management: { label: 'User Management', icon: 'Users', path: '/app/users' },
  my_account: { label: 'My Account', icon: 'UserCircle', path: '/app/account' },
}

// --- Students & internship domains ---
export interface Domain {
  id: string
  branch_id: string
  key: string
  label: string
  created_at: string
}

export interface StudentAccount {
  id: string
  branch_id: string
  domain_id: string | null
  domain_label: string | null
  full_name: string
  email: string
  username: string | null
  mobile: string | null
  account_expiry: string | null
  is_active: boolean
  created_at: string
}

/** Identity returned by GET /student/me for the logged-in student. */
export interface StudentIdentity {
  id: string
  full_name: string
  email: string
  username: string | null
  mobile: string | null
  branch_id: string
  domain_id: string | null
  domain_key: string | null
  domain_label: string | null
  account_expiry: string | null
  is_active: boolean
}

export interface StudentCourseSummary {
  id: string
  title: string
  program: string
  total_lessons: number
  completed_lessons: number
  progress_pct: number
}

export interface StudentQuizQuestion {
  id: string
  quiz_id: string
  prompt: string
  type: QuizQuestionType
  order_index: number
  options: QuizOption[]
  points: number
}

export interface StudentQuiz {
  id: string
  title: string
  pass_percentage: number
  max_attempts: number | null
  questions: StudentQuizQuestion[]
  attempts_used: number
  best_score: number | null
  passed: boolean
}

export interface StudentLesson {
  id: string
  title: string
  order_index: number
  estimated_minutes: number | null
  blocks: LessonBlock[]
  quiz: StudentQuiz | null
  completed: boolean
}

export interface StudentModule {
  id: string
  title: string
  description: string | null
  order_index: number
  lessons: StudentLesson[]
  quiz: StudentQuiz | null
}

export interface StudentCourse {
  id: string
  title: string
  program: string
  modules: StudentModule[]
}

export interface QuizQuestionResult {
  question_id: string
  correct: boolean
  correct_answer: unknown[]
  explanation: string | null
}

export interface QuizSubmitResult {
  score: number
  passed: boolean
  attempt_no: number
  pass_percentage: number
  max_attempts: number | null
  attempts_used: number
  results: QuizQuestionResult[]
}
