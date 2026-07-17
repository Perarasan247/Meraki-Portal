/**
 * In-memory sample data for the admin curriculum + LMS builder, used only in
 * the UI-preview build (VITE_DEV_BYPASS_AUTH). Mirrors the real /curricula,
 * /domains and /lms/* endpoints so the whole authoring flow is demoable and
 * fully interactive with no backend. Dynamic-imported from api.ts.
 */
import type {
  Curriculum, CurriculumContent, Domain, ModuleTree, LessonTree, LessonBlock,
  Quiz, QuizQuestion, LessonBlockType, QuizQuestionType,
  Enquiry, Enrollment, Batch, Expense, StudentAccount, ManagedUser, Profile, BackupCounts,
  Branch, Campaign,
} from '@/lib/types'

const BRANCH = 'dev-branch'
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Math.round(performance.now() * 1000)}`)
const now = () => '2026-07-10T09:00:00.000Z'

export const NOT_HANDLED = Symbol('not-handled')

// --- domains ---
const DOMAINS: Domain[] = [
  { id: 'd-aiml', branch_id: BRANCH, key: 'ai-ml', label: 'Artificial Intelligence & Machine Learning', created_at: now() },
  { id: 'dev-domain', branch_id: BRANCH, key: 'genai', label: 'Generative AI, LLMs & AI Agents', created_at: now() },
  { id: 'dev-domain-3', branch_id: BRANCH, key: 'robotics-iiot', label: 'Robotics & Industrial IoT', created_at: now() },
  { id: 'd-rpa', branch_id: BRANCH, key: 'rpa', label: 'Robotic Process Automation (RPA)', created_at: now() },
  { id: 'dev-domain-2', branch_id: BRANCH, key: 'fullstack', label: 'Full Stack Development', created_at: now() },
  { id: 'd-cloud', branch_id: BRANCH, key: 'cloud-devops', label: 'Cloud Technologies & DevOps', created_at: now() },
  { id: 'd-python', branch_id: BRANCH, key: 'python', label: 'Python Programming', created_at: now() },
  { id: 'd-da', branch_id: BRANCH, key: 'data-analytics', label: 'Data Analytics & Visualisation', created_at: now() },
]

// --- marketing campaigns (lead sources) ---
const CAMPAIGNS: Campaign[] = [
  { id: 'cmp-1', branch_id: BRANCH, name: 'Instagram — Summer Internship 2026', type: 'General', target_audience: 'Final year students', program: 'Generative AI, LLMs & AI Agents', budget: 15000, leads_generated: 24, status: 'Active', created_at: now() },
  { id: 'cmp-2', branch_id: BRANCH, name: 'College Outreach — Anna University', type: 'General', target_audience: 'CSE / IT students', program: null, budget: 8000, leads_generated: 11, status: 'Active', created_at: now() },
  { id: 'cmp-3', branch_id: BRANCH, name: 'Google Ads — AI Course', type: 'General', target_audience: 'Job seekers', program: 'Artificial Intelligence & Machine Learning', budget: 20000, leads_generated: 37, status: 'Completed', created_at: now() },
]

// --- curricula (list metadata) ---
const CURRICULA: Curriculum[] = [
  { id: 'cur1', branch_id: BRANCH, scope: 'Internship', domain_id: 'dev-domain', program: 'Generative AI, LLMs & AI Agents', title: 'Foundations of Generative AI', status: 'Published', phases: [
    { id: 'ph1', title: 'Foundations', description: 'Intro to LLMs and prompting', order: 1, estimated_duration: '2 weeks' },
    { id: 'ph2', title: 'Building with the API', description: 'Hands-on with the Claude API', order: 2, estimated_duration: '3 weeks' },
    { id: 'ph3', title: 'Capstone Project', description: 'Ship a small AI app', order: 3, estimated_duration: '2 weeks' },
  ], created_at: now() },
  { id: 'cur2', branch_id: BRANCH, scope: 'Training', domain_id: 'dev-domain', program: 'Generative AI, LLMs & AI Agents', title: 'Python for AI Engineering', status: 'Draft', phases: [], created_at: now() },
]

// --- branches ---
const BRANCHES: Branch[] = [
  { id: BRANCH, name: 'Meraki Chennai (HQ)', address: 'Chennai, Tamil Nadu' },
  { id: 'dev-branch-2', name: 'Meraki Salem', address: 'Salem, Tamil Nadu' },
]

// --- enquiries ---
const ENQUIRIES: Enquiry[] = [
  { id: 'e1', branch_id: BRANCH, student_name: 'Divya Raman', email: 'divya.raman@gmail.com', mobile: '9840012345', college: null, campaign_id: null, enquiry_type: 'Internship', program: 'Generative AI & LLMs', year_of_study: '3rd Year', reference_source: 'Instagram', status: 'New', notes: null, created_at: '2026-06-28T10:00:00Z', converted_enrollment_id: null },
  { id: 'e2', branch_id: BRANCH, student_name: 'Karthik Nair', email: 'karthik.nair@gmail.com', mobile: '9884567890', college: null, campaign_id: null, enquiry_type: 'Internship', program: 'Full Stack Development', year_of_study: '4th Year', reference_source: 'College fair', status: 'Contacted', notes: 'Call back next week', created_at: '2026-06-25T09:00:00Z', converted_enrollment_id: null },
  { id: 'e3', branch_id: BRANCH, student_name: 'Sneha Pillai', email: 'sneha.pillai@outlook.com', mobile: '9791234560', college: null, campaign_id: null, enquiry_type: 'Internship', program: 'Robotics & IIoT', year_of_study: '2nd Year', reference_source: 'Referral', status: 'Interested', notes: 'Wants weekend batch', created_at: '2026-06-22T14:00:00Z', converted_enrollment_id: null },
  { id: 'e4', branch_id: BRANCH, student_name: 'Arjun Mehta', email: 'arjun.mehta@gmail.com', mobile: '9812345678', college: null, campaign_id: null, enquiry_type: 'Internship', program: 'Generative AI & LLMs', year_of_study: '3rd Year', reference_source: 'LinkedIn', status: 'Contacted', notes: null, created_at: '2026-06-20T11:30:00Z', converted_enrollment_id: null },
  { id: 'e5', branch_id: BRANCH, student_name: 'Priya Venkat', email: 'priya.venkat@gmail.com', mobile: '9765432109', college: null, campaign_id: null, enquiry_type: 'Internship', program: 'Data Analytics', year_of_study: '4th Year', reference_source: 'Instagram', status: 'Converted', notes: 'Enrolled', created_at: '2026-06-15T08:00:00Z', converted_enrollment_id: 'en1' },
  { id: 'e6', branch_id: BRANCH, student_name: 'Rahul Das', email: null, mobile: '9900011122', college: null, campaign_id: null, enquiry_type: 'Internship', program: 'Full Stack Development', year_of_study: '3rd Year', reference_source: 'Website', status: 'New', notes: null, created_at: '2026-06-30T16:00:00Z', converted_enrollment_id: null },
]

// --- enrollments ---
const ENROLLMENTS: Enrollment[] = [
  { id: 'en1', branch_id: BRANCH, student_name: 'Priya Venkat', mobile: '9765432109', email: null, college: null, start_date: null, end_date: null, enrollment_date: null, program: 'Data Analytics', year_of_study: '4th Year', batch_id: 'b1', total_fee: 45000, paid_amount: 45000, pending_amount: 0, fee_status: 'Paid', created_at: '2026-06-15T09:00:00Z' },
  { id: 'en2', branch_id: BRANCH, student_name: 'Aarav Sharma', mobile: '9876543210', email: null, college: null, start_date: null, end_date: null, enrollment_date: null, program: 'Generative AI & LLMs', year_of_study: '3rd Year', batch_id: 'b2', total_fee: 60000, paid_amount: 30000, pending_amount: 30000, fee_status: 'Partial', created_at: '2026-06-10T09:00:00Z' },
  { id: 'en3', branch_id: BRANCH, student_name: 'Meera Iyer', mobile: '9812309876', email: null, college: null, start_date: null, end_date: null, enrollment_date: null, program: 'Full Stack Development', year_of_study: '4th Year', batch_id: 'b3', total_fee: 55000, paid_amount: 0, pending_amount: 55000, fee_status: 'Pending', created_at: '2026-06-05T09:00:00Z' },
  { id: 'en4', branch_id: BRANCH, student_name: 'Vikram Reddy', mobile: '9700012345', email: null, college: null, start_date: null, end_date: null, enrollment_date: null, program: 'Robotics & IIoT', year_of_study: '2nd Year', batch_id: 'b4', total_fee: 50000, paid_amount: 50000, pending_amount: 0, fee_status: 'Paid', created_at: '2026-05-28T09:00:00Z' },
]

// --- batches ---
const BATCHES: Batch[] = [
  { id: 'b1', branch_id: BRANCH, scope: 'Internship', batch_name: 'DA-2026-A', program: 'Data Analytics & Visualisation', trainer: 'Ananya Rao', venue: null, start_date: '2026-07-01', end_date: '2026-09-15', seats_total: 30, seats_filled: 22, mode: 'Hybrid', status: 'Active', created_at: '2026-06-01T09:00:00Z' },
  { id: 'b2', branch_id: BRANCH, scope: 'Training', batch_name: 'GENAI-2026-A', program: 'Generative AI, LLMs & AI Agents', trainer: 'Suresh Kumar', venue: null, start_date: '2026-07-10', end_date: '2026-09-30', seats_total: 25, seats_filled: 18, mode: 'Online', status: 'Active', created_at: '2026-06-05T09:00:00Z' },
  { id: 'b3', branch_id: BRANCH, scope: 'Internship', batch_name: 'FS-2026-B', program: 'Full Stack Development', trainer: 'Nadia Fernandez', venue: null, start_date: '2026-08-01', end_date: '2026-10-20', seats_total: 30, seats_filled: 9, mode: 'Offline', status: 'Upcoming', created_at: '2026-06-20T09:00:00Z' },
  { id: 'b4', branch_id: BRANCH, scope: 'Project', batch_name: 'ROB-2026-A', program: 'Robotics & Industrial IoT', trainer: 'Imran Khan', venue: null, start_date: '2026-05-01', end_date: '2026-07-01', seats_total: 20, seats_filled: 20, mode: 'Offline', status: 'Completed', created_at: '2026-04-15T09:00:00Z' },
]

// --- expenses ---
const EXPENSES: Expense[] = [
  { id: 'x1', branch_id: BRANCH, title: 'Cloud GPU credits', category: 'Infrastructure', amount: 42000, vendor: 'AWS', payment_method: null, invoice_no: null, date: '2026-06-28', notes: 'Model training', status: 'Approved', created_at: '2026-06-28T09:00:00Z' },
  { id: 'x2', branch_id: BRANCH, title: 'Marketing — Instagram ads', category: 'Marketing', amount: 18000, vendor: 'Meta', payment_method: null, invoice_no: null, date: '2026-06-25', notes: null, status: 'Approved', created_at: '2026-06-25T09:00:00Z' },
  { id: 'x3', branch_id: BRANCH, title: 'Guest lecturer honorarium', category: 'Training', amount: 15000, vendor: null, payment_method: null, invoice_no: null, date: '2026-06-20', notes: 'GenAI workshop', status: 'Pending', created_at: '2026-06-20T09:00:00Z' },
  { id: 'x4', branch_id: BRANCH, title: 'Office rent — June', category: 'Rent', amount: 35000, vendor: 'Prestige Estates', payment_method: null, invoice_no: null, date: '2026-06-01', notes: null, status: 'Approved', created_at: '2026-06-01T09:00:00Z' },
  { id: 'x5', branch_id: BRANCH, title: 'Snacks & refreshments', category: 'Operations', amount: 5000, vendor: 'Local vendor', payment_method: null, invoice_no: null, date: '2026-06-18', notes: null, status: 'Pending', created_at: '2026-06-18T09:00:00Z' },
]

// --- students ---
const STUDENTS: StudentAccount[] = [
  { id: 's1', branch_id: BRANCH, domain_id: 'dev-domain', domain_label: 'Generative AI & LLMs', full_name: 'Aarav Sharma', email: 'aarav@student.meraki.local', username: 'aarav_ai', mobile: '9876543210', account_expiry: null, is_active: true, created_at: '2026-06-10T09:00:00Z' },
  { id: 's2', branch_id: BRANCH, domain_id: 'dev-domain', domain_label: 'Generative AI & LLMs', full_name: 'Nisha Gupta', email: 'nisha@student.meraki.local', username: 'nisha_g', mobile: '9812345671', account_expiry: '2026-12-31T23:59:59Z', is_active: true, created_at: '2026-06-11T09:00:00Z' },
  { id: 's3', branch_id: BRANCH, domain_id: 'dev-domain-2', domain_label: 'Full Stack Development', full_name: 'Meera Iyer', email: 'meera@student.meraki.local', username: 'meera_fs', mobile: '9812309876', account_expiry: null, is_active: true, created_at: '2026-06-05T09:00:00Z' },
  { id: 's4', branch_id: BRANCH, domain_id: 'dev-domain-3', domain_label: 'Robotics & IIoT', full_name: 'Vikram Reddy', email: 'vikram@student.meraki.local', username: 'vikram_r', mobile: '9700012345', account_expiry: null, is_active: false, created_at: '2026-05-28T09:00:00Z' },
]

// --- managed users (staff) ---
const USERS: ManagedUser[] = [
  { id: 'dev-preview-user', branch_id: null, full_name: 'Super Admin (Chennai)', email: 'admin@meraki.local', mobile: '9999999999', role: 'super_admin', modules: ['dashboard', 'enquiry', 'enrollment', 'batch_management', 'batch_execution', 'curriculum', 'expense', 'student_management', 'user_management', 'my_account'], permission_level: 'Full Access', last_login: '2026-07-10T08:00:00Z', registered_at: '2026-01-01T09:00:00Z', is_active: true },
  { id: 'u2', branch_id: 'dev-branch-2', full_name: 'Ananya Rao', email: 'ananya@meraki.local', mobile: '9840011111', role: 'branch_admin', modules: ['dashboard', 'enquiry', 'enrollment', 'batch_management', 'batch_execution', 'curriculum', 'expense', 'student_management', 'user_management', 'my_account'], permission_level: 'Full Access', last_login: '2026-07-09T10:00:00Z', registered_at: '2026-02-15T09:00:00Z', is_active: true },
  { id: 'u3', branch_id: BRANCH, full_name: 'Ravi Kumar', email: 'ravi@meraki.local', mobile: '9840022222', role: 'trainer', modules: ['batch_management', 'batch_execution', 'curriculum', 'student_management', 'my_account'], permission_level: 'custom', last_login: '2026-07-08T12:00:00Z', registered_at: '2026-03-01T09:00:00Z', is_active: true },
  { id: 'u4', branch_id: 'dev-branch-2', full_name: 'Priya Suresh', email: 'priya.s@meraki.local', mobile: '9840033333', role: 'trainer', modules: ['batch_execution', 'curriculum', 'student_management', 'my_account'], permission_level: 'custom', last_login: '2026-07-07T09:00:00Z', registered_at: '2026-03-15T09:00:00Z', is_active: true },
]

// --- LMS content per curriculum (modules → lessons → blocks/quizzes) ---
let seedOrder = 0
function textBlock(lessonId: string, markdown: string): LessonBlock {
  return { id: uuid(), lesson_id: lessonId, branch_id: BRANCH, type: 'text', order_index: seedOrder++, content: { markdown }, created_at: now() }
}
function question(quizId: string, prompt: string, type: QuizQuestionType, options: string[], correct: unknown[], i: number): QuizQuestion {
  return {
    id: uuid(), quiz_id: quizId, branch_id: BRANCH, prompt, type, order_index: i,
    options: options.map((text) => ({ id: uuid(), text })), correct, points: 1, explanation: null, created_at: now(),
  }
}

function seedQuiz(curriculumId: string, moduleId: string | null, lessonId: string | null, title: string): Quiz {
  const id = uuid()
  const qs = moduleId
    ? [
        question(id, 'A language model is fundamentally trained to predict…', 'single_choice',
          ['The sentiment', 'The next token', 'The language', 'The author'], [], 0),
        question(id, 'Embeddings represent tokens as vectors.', 'true_false', [], [true], 1),
      ]
    : []
  return { id, curriculum_id: curriculumId, branch_id: BRANCH, module_id: moduleId, lesson_id: lessonId, title, pass_percentage: 70, max_attempts: 3, created_at: now(), questions: qs }
}

const CONTENT: Record<string, ModuleTree[]> = {
  cur1: (() => {
    const cid = 'cur1'
    const m1 = uuid(), m2 = uuid()
    const l1 = uuid(), l2 = uuid(), l3 = uuid()
    const mod1: ModuleTree = {
      id: m1, curriculum_id: cid, branch_id: BRANCH, title: 'Understanding LLMs',
      description: 'What generative AI is and how modern language models work.',
      order_index: 0, is_published: true, created_at: now(),
      lessons: [
        { id: l1, module_id: m1, branch_id: BRANCH, title: 'What is Generative AI?', order_index: 0, estimated_minutes: 8, is_published: true, created_at: now(), blocks: [textBlock(l1, 'Generative AI creates new content — text, images, audio, or code — rather than only classifying existing data.')], quiz: null },
        { id: l2, module_id: m1, branch_id: BRANCH, title: 'How LLMs Work', order_index: 1, estimated_minutes: 12, is_published: true, created_at: now(), blocks: [textBlock(l2, 'LLMs predict the next token. Scale that objective across billions of parameters and capable behaviour emerges.')], quiz: null },
      ],
      quiz: null,
    }
    mod1.quiz = seedQuiz(cid, m1, null, 'LLM Basics Quiz')
    const mod2: ModuleTree = {
      id: m2, curriculum_id: cid, branch_id: BRANCH, title: 'Prompt Engineering',
      description: 'Techniques to get reliable output from any model.',
      order_index: 1, is_published: false, created_at: now(),
      lessons: [
        { id: l3, module_id: m2, branch_id: BRANCH, title: 'Anatomy of a Good Prompt', order_index: 0, estimated_minutes: 9, is_published: false, created_at: now(), blocks: [textBlock(l3, 'A strong prompt states role, task, constraints and gives an example.')], quiz: null },
      ],
      quiz: null,
    }
    return [mod1, mod2]
  })(),
  cur2: (() => {
    const cid = 'cur2'
    const m1 = uuid()
    const l1 = uuid()
    return [{
      id: m1, curriculum_id: cid, branch_id: BRANCH, title: 'Python Essentials',
      description: 'Core language features for AI engineering.',
      order_index: 0, is_published: false, created_at: now(),
      lessons: [
        { id: l1, module_id: m1, branch_id: BRANCH, title: 'Data Structures That Matter', order_index: 0, estimated_minutes: 12, is_published: false, created_at: now(), blocks: [textBlock(l1, 'Lists, dicts, sets and tuples cover most day-to-day needs.')], quiz: null },
      ],
      quiz: null,
    }]
  })(),
}

// --- lookup helpers over the mutable tree ---
function allModules(): ModuleTree[] { return Object.values(CONTENT).flat() }
function findModule(id: string) { return allModules().find((m) => m.id === id) }
function findLesson(id: string): { lesson: LessonTree; module: ModuleTree } | null {
  for (const m of allModules()) { const l = m.lessons.find((x) => x.id === id); if (l) return { lesson: l, module: m } }
  return null
}
function findBlock(id: string): { block: LessonBlock; lesson: LessonTree } | null {
  for (const m of allModules()) for (const l of m.lessons) { const b = l.blocks.find((x) => x.id === id); if (b) return { block: b, lesson: l } }
  return null
}
function allQuizzes(): Quiz[] {
  const out: Quiz[] = []
  for (const m of allModules()) { if (m.quiz) out.push(m.quiz); for (const l of m.lessons) if (l.quiz) out.push(l.quiz) }
  return out
}
function findQuiz(id: string) { return allQuizzes().find((q) => q.id === id) }
function reindex<T extends { order_index: number }>(arr: T[], ids: string[], key: (t: T) => string) {
  const pos = new Map(ids.map((id, i) => [id, i]))
  arr.sort((a, b) => (pos.get(key(a)) ?? 0) - (pos.get(key(b)) ?? 0))
  arr.forEach((t, i) => (t.order_index = i))
}

export function handleAdminMock(method: string, path: string, body: any): unknown {
  const p = path.split('?')[0]
  const B = body ?? {}
  let m: RegExpMatchArray | null

  // Mirror the real list endpoints: plain array when no `page`, or a paginated
  // envelope (with server-side search/filter applied) when `page` is present.
  function listResult<T extends Record<string, any>>(rows: T[], searchFields: string[]): unknown {
    const qs = new URLSearchParams(path.split('?')[1] || '')
    let out = rows.slice()
    const search = qs.get('search')?.trim().toLowerCase()
    if (search) out = out.filter((r) => searchFields.map((f) => String(r[f] ?? '')).join(' ').toLowerCase().includes(search))
    for (const [param, field] of [['status_filter', 'status'], ['fee_status', 'fee_status'], ['program', 'program'], ['scope_filter', 'scope'], ['mode', 'mode'], ['year_of_study', 'year_of_study'], ['batch_id', 'batch_id'], ['domain_id', 'domain_id'], ['role_filter', 'role']] as const) {
      const v = qs.get(param)
      // Only apply a filter these rows actually carry. `status_filter` means
      // `status` for enquiries but `is_active` for users — without this guard
      // it would match nothing and silently empty the list.
      if (v && out.length > 0 && field in out[0]) out = out.filter((r) => r[field] === v)
    }
    // Users have no `status` column — their status is the is_active boolean.
    const active = qs.get('status_filter')
    if (active && out.length > 0 && 'is_active' in out[0]) {
      out = out.filter((r) => r.is_active === (active === 'active'))
    }
    // Sort the whole set before paging, mirroring the real API.
    const sortBy = qs.get('sort_by')
    if (sortBy) {
      const dir = qs.get('sort_dir') === 'asc' ? 1 : -1
      out.sort((a, b) => {
        const x = a[sortBy] ?? ''
        const y = b[sortBy] ?? ''
        return String(x).localeCompare(String(y), undefined, { numeric: true }) * dir
      })
    }
    const pageParam = qs.get('page')
    if (!pageParam) return out
    const page = Math.max(1, parseInt(pageParam) || 1)
    const size = Math.max(1, parseInt(qs.get('page_size') || '25') || 25)
    const start = (page - 1) * size
    return { items: out.slice(start, start + size), total: out.length, page, page_size: size }
  }

  // ---- dashboard (derived from the mock records so Year/Month/Program filters work) ----
  if (method === 'GET' && p === '/dashboard/summary') {
    const qs = new URLSearchParams(path.split('?')[1] || '')
    const year = qs.get('year')
    const month = qs.get('month')
    const program = qs.get('program')
    const MONTHS: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 }
    const inPeriod = (ts: string) => {
      if (!year && !month) return true
      const d = new Date(ts)
      if (year && d.getFullYear() !== Number(year)) return false
      if (month && d.getMonth() + 1 !== MONTHS[month]) return false
      return true
    }
    let enq = ENQUIRIES.filter((e) => inPeriod(e.created_at))
    let enr = ENROLLMENTS.filter((e) => inPeriod(e.created_at))
    const exp = EXPENSES.filter((e) => inPeriod(e.created_at))
    const bat = BATCHES.filter((b) => inPeriod(b.created_at))
    const cur = CURRICULA.filter((c) => inPeriod(c.created_at))
    if (program) { enq = enq.filter((e) => e.program === program); enr = enr.filter((e) => e.program === program) }
    const programs: Record<string, number> = {}
    for (const e of enq) programs[e.program] = (programs[e.program] ?? 0) + 1
    return {
      module_counts: {
        enquiry: enq.length, enrollment: enr.length, batch_management: bat.length, batch_execution: 1,
        curriculum: cur.length, expense: exp.length, student_management: STUDENTS.length,
        user_management: USERS.length, my_account: null,
      },
      summary: {
        total_enquiries: enq.length,
        converted_count: enq.filter((e) => e.status === 'Converted').length,
        students_enrolled: enr.length,
        revenue: enr.reduce((s, e) => s + e.paid_amount, 0),
        total_expenses: exp.reduce((s, e) => s + e.amount, 0),
        expense_records: exp.length,
      },
      programs,
    }
  }

  // ---- domains ----
  // ---- marketing campaigns (lead sources for the enquiry form) ----
  if (method === 'GET' && p === '/marketing/campaigns') return CAMPAIGNS

  if (method === 'GET' && p === '/domains') return DOMAINS
  if (method === 'POST' && p === '/domains') {
    const d: Domain = { id: uuid(), branch_id: B.branch_id || BRANCH, key: B.key || String(B.label ?? '').toLowerCase().replace(/\s+/g, '-'), label: B.label ?? '', created_at: now() }
    DOMAINS.push(d); return d
  }

  // ---- branches ----
  if (method === 'GET' && p === '/branches') return BRANCHES
  if (method === 'POST' && p === '/branches') {
    const b: Branch = { id: uuid(), name: B.name ?? '', address: B.address ?? null }
    BRANCHES.push(b); return b
  }

  // ---- public website contact form -> lands as a new enquiry ----
  if (method === 'POST' && p === '/public/enquiry') {
    const e: Enquiry = { id: uuid(), branch_id: BRANCH, student_name: B.name ?? '', email: B.email || null, mobile: B.mobile ?? '', college: null, campaign_id: null, enquiry_type: 'Internship', program: B.program ?? '', year_of_study: null, reference_source: 'Website', status: 'New', notes: B.message || null, created_at: now(), converted_enrollment_id: null }
    ENQUIRIES.unshift(e)
    return { ok: true, id: e.id }
  }

  // ---- enquiries ----
  if (method === 'GET' && p === '/enquiries') return listResult(ENQUIRIES, ['student_name', 'mobile', 'program', 'email'])
  if (method === 'POST' && p === '/enquiries') {
    const e: Enquiry = { id: uuid(), branch_id: BRANCH, student_name: B.student_name ?? '', email: B.email || null, mobile: B.mobile ?? '', college: B.college || null, enquiry_type: B.enquiry_type ?? 'Internship', program: B.program ?? '', year_of_study: B.year_of_study || null, reference_source: B.reference_source || null, campaign_id: B.campaign_id || null, status: B.status ?? 'New', notes: B.notes || null, created_at: now(), converted_enrollment_id: null }
    ENQUIRIES.unshift(e); return e
  }
  m = p.match(/^\/enquiries\/([^/]+)\/convert$/)
  if (method === 'POST' && m) {
    const e = ENQUIRIES.find((x) => x.id === m![1])
    if (e) {
      e.status = 'Converted'
      // Carry the enquiry's contact details across, mirroring the real API.
      const en: Enrollment = { id: uuid(), branch_id: BRANCH, student_name: e.student_name, mobile: e.mobile, email: e.email, college: e.college, program: e.program, year_of_study: e.year_of_study, batch_id: null, start_date: null, end_date: null, enrollment_date: now().slice(0, 10), total_fee: B.total_fee ?? 0, paid_amount: 0, pending_amount: B.total_fee ?? 0, fee_status: 'Pending', created_at: now() }
      ENROLLMENTS.unshift(en); e.converted_enrollment_id = en.id
    }
    return {}
  }
  m = p.match(/^\/enquiries\/([^/]+)$/)
  if (m) {
    const e = ENQUIRIES.find((x) => x.id === m![1])
    if (method === 'PATCH' && e) { Object.assign(e, B); return e }
    if (method === 'DELETE' && e) { ENQUIRIES.splice(ENQUIRIES.indexOf(e), 1); return {} }
  }

  // ---- enrollments ----
  function feeStatus(total: number, paid: number) { return paid <= 0 ? 'Pending' : paid >= total ? 'Paid' : 'Partial' }
  if (method === 'GET' && p === '/enrollments') return listResult(ENROLLMENTS, ['student_name', 'mobile', 'program'])
  if (method === 'POST' && p === '/enrollments') {
    const total = Number(B.total_fee) || 0
    const paid = Number(B.paid_amount) || 0
    const en: Enrollment = {
      id: uuid(), branch_id: BRANCH, student_name: B.student_name ?? '', mobile: B.mobile ?? '',
      email: B.email || null, college: B.college || null,
      program: B.program ?? '', year_of_study: B.year_of_study || null, batch_id: B.batch_id || null,
      start_date: B.start_date || null, end_date: B.end_date || null, enrollment_date: B.enrollment_date || null,
      total_fee: total, paid_amount: paid, pending_amount: Math.max(0, total - paid),
      fee_status: feeStatus(total, paid) as Enrollment['fee_status'], created_at: now(),
    }
    ENROLLMENTS.unshift(en); return en
  }
  m = p.match(/^\/enrollments\/([^/]+)\/payment$/)
  if (method === 'POST' && m) {
    const en = ENROLLMENTS.find((x) => x.id === m![1])
    if (en) {
      en.paid_amount += Number(B.amount) || 0
      en.pending_amount = Math.max(0, en.total_fee - en.paid_amount)
      en.fee_status = feeStatus(en.total_fee, en.paid_amount) as Enrollment['fee_status']
    }
    return en ?? {}
  }
  m = p.match(/^\/enrollments\/([^/]+)$/)
  if (m) {
    const en = ENROLLMENTS.find((x) => x.id === m![1])
    if (method === 'PATCH' && en) {
      for (const k of ['student_name', 'mobile', 'program', 'year_of_study', 'batch_id', 'total_fee'] as const) {
        if (B[k] !== undefined) (en as unknown as Record<string, unknown>)[k] = B[k]
      }
      en.total_fee = Number(en.total_fee) || 0
      en.pending_amount = Math.max(0, en.total_fee - en.paid_amount)
      en.fee_status = feeStatus(en.total_fee, en.paid_amount) as Enrollment['fee_status']
      return en
    }
    if (method === 'DELETE' && en) { ENROLLMENTS.splice(ENROLLMENTS.indexOf(en), 1); return {} }
  }

  // ---- batches ----
  if (method === 'GET' && p === '/batches') return listResult(BATCHES, ['batch_name', 'program', 'trainer', 'venue'])
  if (method === 'POST' && p === '/batches') { const b: Batch = { id: uuid(), branch_id: BRANCH, batch_name: B.batch_name ?? '', program: B.program ?? '', scope: B.scope ?? 'Internship', trainer: B.trainer || null, venue: B.venue || null, start_date: B.start_date || null, end_date: B.end_date || null, seats_total: B.seats_total ?? 0, seats_filled: B.seats_filled ?? 0, mode: B.mode ?? 'Online', status: B.status ?? 'Upcoming', created_at: now() }; BATCHES.unshift(b); return b }
  m = p.match(/^\/batches\/([^/]+)$/)
  if (m) { const i = BATCHES.findIndex((x) => x.id === m![1]); if (i >= 0) { if (method === 'PATCH') { BATCHES[i] = { ...BATCHES[i], ...B }; return BATCHES[i] } if (method === 'DELETE') { BATCHES.splice(i, 1); return {} } } }

  // ---- expenses ----
  if (method === 'GET' && p === '/expenses') return EXPENSES
  if (method === 'POST' && p === '/expenses') { const x: Expense = { id: uuid(), branch_id: BRANCH, title: B.title ?? '', category: B.category ?? '', amount: B.amount ?? 0, vendor: B.vendor || null, payment_method: B.payment_method || null, invoice_no: B.invoice_no || null, date: B.date || now().slice(0, 10), notes: B.notes || null, status: B.status ?? 'Pending', created_at: now() }; EXPENSES.unshift(x); return x }
  m = p.match(/^\/expenses\/([^/]+?)(\/approve)?$/)
  if (m) { const x = EXPENSES.find((e) => e.id === m![1]); if (x) { if (method === 'PATCH' || method === 'POST') { if (m[2]) x.status = 'Approved'; else Object.assign(x, B); return x } if (method === 'DELETE') { EXPENSES.splice(EXPENSES.indexOf(x), 1); return {} } } }

  // ---- students ----
  if (method === 'GET' && p === '/students') return listResult(STUDENTS, ['full_name', 'email', 'username', 'domain_label', 'mobile'])
  if (method === 'POST' && p === '/students') { const dom = DOMAINS.find((d) => d.id === B.domain_id); const s: StudentAccount = { id: uuid(), branch_id: BRANCH, domain_id: B.domain_id || null, domain_label: dom ? dom.label : null, full_name: B.full_name ?? '', email: B.email ?? '', username: B.username || null, mobile: B.mobile || null, account_expiry: B.account_expiry || null, is_active: true, created_at: now() }; STUDENTS.unshift(s); return s }
  m = p.match(/^\/students\/([^/]+)$/)
  if (m) { const s = STUDENTS.find((x) => x.id === m![1]); if (s) { if (method === 'PATCH') { Object.assign(s, B); if (B.domain_id) { const d = DOMAINS.find((dd) => dd.id === B.domain_id); s.domain_label = d ? d.label : s.domain_label } return s } if (method === 'DELETE') { STUDENTS.splice(STUDENTS.indexOf(s), 1); return {} } } }

  // ---- users (staff) ----
  if (method === 'GET' && p === '/users') return listResult(USERS, ['full_name', 'email', 'mobile'])
  if (method === 'GET' && p === '/users/module-access-coverage') { const t: Record<string, number> = {}; for (const u of USERS) for (const mod of u.modules) t[mod] = (t[mod] ?? 0) + 1; return t }
  if (method === 'POST' && p === '/users') { const u: ManagedUser = { id: uuid(), branch_id: B.branch_id || null, full_name: B.full_name ?? '', email: B.email ?? '', mobile: B.mobile || null, role: B.role === 'trainer' ? 'trainer' : 'branch_admin', modules: B.modules ?? [], permission_level: B.permission_level ?? 'custom', last_login: null, registered_at: now(), is_active: true }; USERS.push(u); return u }
  m = p.match(/^\/users\/([^/]+)\/transfer-super-admin$/)
  if (method === 'POST' && m) {
    const target = USERS.find((u) => u.id === m![1])
    const current = USERS.find((u) => u.role === 'super_admin')
    if (target) {
      const targetBranch = target.branch_id ?? BRANCH
      target.role = 'super_admin'; target.branch_id = null; target.permission_level = 'Full Access'
      if (current && current.id !== target.id) { current.role = 'branch_admin'; current.branch_id = targetBranch }
    }
    return { ok: true, new_super_admin_id: m[1] }
  }
  m = p.match(/^\/users\/([^/]+)$/)
  if (method === 'PATCH' && m) { const u = USERS.find((x) => x.id === m![1]); if (u) { if (typeof B.is_active === 'boolean') u.is_active = B.is_active; if (B.modules) u.modules = B.modules; if (B.full_name) u.full_name = B.full_name; } return u ?? {} }
  if (method === 'DELETE' && m) {
    const idx = USERS.findIndex((x) => x.id === m![1])
    if (idx === -1) return {}
    if (/[?&]hard=true/.test(path)) USERS.splice(idx, 1)  // permanent delete
    else USERS[idx].is_active = false                     // soft deactivate
    return {}
  }

  // ---- account ----
  if (method === 'GET' && p === '/account/profile') return USERS[0] as Profile
  if (method === 'GET' && p === '/account/backup/counts') return { branch_id: null, enquiries: ENQUIRIES.length, enrollments: ENROLLMENTS.length, batches: BATCHES.length, expenses: EXPENSES.length, curricula: CURRICULA.length } as BackupCounts
  if (method === 'POST' && p === '/account/backup/restore') return { restored: {}, errors: [] }

  // ---- batch execution ----
  m = p.match(/^\/batch-execution\/by-batch\/([^/]+)$/)
  if (method === 'GET' && m) return { id: 'exec-' + m[1], branch_id: BRANCH, batch_id: m[1], curriculum_id: '', phase_progress: [], progress_pct: 0, updated_at: now() }
  if (method === 'POST' && p === '/batch-execution') return { id: 'exec-' + (B.batch_id ?? ''), branch_id: BRANCH, batch_id: B.batch_id ?? '', curriculum_id: B.curriculum_id ?? '', phase_progress: [], progress_pct: 0, updated_at: now() }
  m = p.match(/^\/batch-execution\/([^/]+)$/)
  if (method === 'PATCH' && m) {
    const pp = (B.phase_progress ?? []) as { status: string }[]
    const done = pp.filter((x) => x.status === 'Completed').length
    return { id: m[1], branch_id: BRANCH, batch_id: '', curriculum_id: '', phase_progress: pp, progress_pct: pp.length ? Math.round((done / pp.length) * 100) : 0, updated_at: now() }
  }

  // ---- curricula ----
  if (method === 'GET' && p === '/curricula') return listResult(CURRICULA, ['title', 'program'])
  if (method === 'POST' && p === '/curricula') {
    const c: Curriculum = {
      id: uuid(), branch_id: B.branch_id || BRANCH, domain_id: B.domain_id ?? null,
      program: B.program ?? '', title: B.title ?? '', scope: B.scope ?? 'Internship', status: 'Draft',
      phases: B.phases ?? [], created_at: now(),
    }
    CURRICULA.push(c)
    CONTENT[c.id] = []
    return c
  }
  m = p.match(/^\/curricula\/([^/]+)\/(publish|unpublish)$/)
  if (method === 'PATCH' && m) {
    const c = CURRICULA.find((x) => x.id === m![1]); if (!c) return NOT_HANDLED
    c.status = m[2] === 'publish' ? 'Published' : 'Draft'
    return c
  }
  m = p.match(/^\/curricula\/([^/]+)$/)
  if (method === 'PATCH' && m) {
    const c = CURRICULA.find((x) => x.id === m![1]); if (!c) return NOT_HANDLED
    if (B.title != null) c.title = B.title
    if (B.program != null) c.program = B.program
    if ('domain_id' in B) c.domain_id = B.domain_id
    if (B.phases != null) c.phases = B.phases
    return c
  }
  if (method === 'DELETE' && m) {
    const i = CURRICULA.findIndex((x) => x.id === m![1]); if (i < 0) return NOT_HANDLED
    CURRICULA.splice(i, 1); delete CONTENT[m[1]]; return {}
  }

  // ---- lms content ----
  m = p.match(/^\/lms\/curricula\/([^/]+)\/content$/)
  if (method === 'GET' && m) {
    const cid = m[1]
    const mods = (CONTENT[cid] ?? []).slice().sort((a, b) => a.order_index - b.order_index)
    return { curriculum_id: cid, modules: mods } as CurriculumContent
  }
  m = p.match(/^\/lms\/curricula\/([^/]+)\/modules$/)
  if (method === 'POST' && m) {
    const cid = m[1]
    const mod: ModuleTree = { id: uuid(), curriculum_id: cid, branch_id: BRANCH, title: B.title ?? '', description: B.description ?? null, order_index: B.order_index ?? (CONTENT[cid]?.length ?? 0), is_published: false, created_at: now(), lessons: [], quiz: null }
    ;(CONTENT[cid] ??= []).push(mod)
    return mod
  }
  m = p.match(/^\/lms\/curricula\/([^/]+)\/modules\/reorder$/)
  if (method === 'POST' && m) { reindex(CONTENT[m[1]] ?? [], B.ids ?? [], (x) => x.id); return {} }

  m = p.match(/^\/lms\/modules\/([^/]+)$/)
  if (m) {
    const mod = findModule(m[1]); if (!mod) return NOT_HANDLED
    if (method === 'PATCH') {
      if (B.title != null) mod.title = B.title
      if ('description' in B) mod.description = B.description
      if (B.is_published != null) mod.is_published = B.is_published
      return mod
    }
    if (method === 'DELETE') {
      const arr = CONTENT[mod.curriculum_id]; arr.splice(arr.findIndex((x) => x.id === mod.id), 1); return {}
    }
  }
  m = p.match(/^\/lms\/modules\/([^/]+)\/lessons$/)
  if (method === 'POST' && m) {
    const mod = findModule(m[1]); if (!mod) return NOT_HANDLED
    const lesson: LessonTree = { id: uuid(), module_id: mod.id, branch_id: BRANCH, title: B.title ?? '', order_index: B.order_index ?? mod.lessons.length, estimated_minutes: B.estimated_minutes ?? null, is_published: B.is_published ?? false, created_at: now(), blocks: [], quiz: null }
    mod.lessons.push(lesson); return lesson
  }
  m = p.match(/^\/lms\/modules\/([^/]+)\/lessons\/reorder$/)
  if (method === 'POST' && m) { const mod = findModule(m[1]); if (mod) reindex(mod.lessons, B.ids ?? [], (x) => x.id); return {} }

  m = p.match(/^\/lms\/lessons\/([^/]+)$/)
  if (m) {
    const found = findLesson(m[1]); if (!found) return NOT_HANDLED
    if (method === 'PATCH') {
      const l = found.lesson
      if (B.title != null) l.title = B.title
      if ('estimated_minutes' in B) l.estimated_minutes = B.estimated_minutes
      if (B.is_published != null) l.is_published = B.is_published
      return l
    }
    if (method === 'DELETE') { const ls = found.module.lessons; ls.splice(ls.findIndex((x) => x.id === m![1]), 1); return {} }
  }
  m = p.match(/^\/lms\/lessons\/([^/]+)\/blocks$/)
  if (method === 'POST' && m) {
    const found = findLesson(m[1]); if (!found) return NOT_HANDLED
    const block: LessonBlock = { id: uuid(), lesson_id: found.lesson.id, branch_id: BRANCH, type: (B.type as LessonBlockType) ?? 'text', order_index: B.order_index ?? found.lesson.blocks.length, content: B.content ?? {}, created_at: now() }
    found.lesson.blocks.push(block); return block
  }
  m = p.match(/^\/lms\/lessons\/([^/]+)\/blocks\/reorder$/)
  if (method === 'POST' && m) { const f = findLesson(m[1]); if (f) reindex(f.lesson.blocks, B.ids ?? [], (x) => x.id); return {} }

  m = p.match(/^\/lms\/blocks\/([^/]+)$/)
  if (m) {
    const found = findBlock(m[1]); if (!found) return NOT_HANDLED
    if (method === 'PATCH') { if (B.content != null) found.block.content = B.content; return found.block }
    if (method === 'DELETE') { const bs = found.lesson.blocks; bs.splice(bs.findIndex((x) => x.id === m![1]), 1); return {} }
  }

  // ---- quizzes ----
  if (method === 'POST' && p === '/lms/quizzes') {
    const quiz: Quiz = { id: uuid(), curriculum_id: '', branch_id: BRANCH, module_id: B.module_id ?? null, lesson_id: B.lesson_id ?? null, title: B.title ?? 'Quiz', pass_percentage: 70, max_attempts: 3, created_at: now(), questions: [] }
    if (B.module_id) { const mod = findModule(B.module_id); if (mod) { quiz.curriculum_id = mod.curriculum_id; mod.quiz = quiz } }
    else if (B.lesson_id) { const f = findLesson(B.lesson_id); if (f) { quiz.curriculum_id = f.module.curriculum_id; f.lesson.quiz = quiz } }
    return quiz
  }
  m = p.match(/^\/lms\/quizzes\/([^/]+)$/)
  if (m) {
    const quiz = findQuiz(m[1]); if (!quiz) return NOT_HANDLED
    if (method === 'PATCH') {
      if (B.pass_percentage != null) quiz.pass_percentage = B.pass_percentage
      if ('max_attempts' in B) quiz.max_attempts = B.max_attempts
      if (B.title != null) quiz.title = B.title
      return quiz
    }
    if (method === 'DELETE') {
      for (const mod of allModules()) { if (mod.quiz?.id === m![1]) mod.quiz = null; for (const l of mod.lessons) if (l.quiz?.id === m![1]) l.quiz = null }
      return {}
    }
  }
  m = p.match(/^\/lms\/quizzes\/([^/]+)\/questions$/)
  if (method === 'POST' && m) {
    const quiz = findQuiz(m[1]); if (!quiz) return NOT_HANDLED
    const q: QuizQuestion = { id: uuid(), quiz_id: quiz.id, branch_id: BRANCH, prompt: B.prompt ?? '', type: B.type ?? 'single_choice', order_index: B.order_index ?? quiz.questions.length, options: B.options ?? [], correct: B.correct ?? [], points: B.points ?? 1, explanation: null, created_at: now() }
    quiz.questions.push(q); return q
  }
  m = p.match(/^\/lms\/quizzes\/([^/]+)\/questions\/reorder$/)
  if (method === 'POST' && m) { const quiz = findQuiz(m[1]); if (quiz) reindex(quiz.questions, B.ids ?? [], (x) => x.id); return {} }

  m = p.match(/^\/lms\/questions\/([^/]+)$/)
  if (m) {
    for (const quiz of allQuizzes()) {
      const q = quiz.questions.find((x) => x.id === m![1])
      if (!q) continue
      if (method === 'PATCH') {
        if (B.prompt != null) q.prompt = B.prompt
        if (B.points != null) q.points = B.points
        if ('explanation' in B) q.explanation = B.explanation
        if (B.options != null) q.options = B.options
        if (B.correct != null) q.correct = B.correct
        return q
      }
      if (method === 'DELETE') { quiz.questions.splice(quiz.questions.indexOf(q), 1); return {} }
    }
    return NOT_HANDLED
  }

  return NOT_HANDLED
}
