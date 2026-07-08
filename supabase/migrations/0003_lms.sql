-- Meraki Portal — LMS (Learning Management) schema
-- Extends Curriculum into an authorable course structure:
--   curriculum -> modules -> lessons -> content blocks (text/video/image)
--   quizzes attach to EITHER a module OR a lesson (both levels supported)
-- Plus student-side progress tables (schema ready; student website is future).
--
-- Branch scoping: every LMS table denormalizes branch_id so the existing
-- RLS branch pattern (auth.jwt_branch_id()) applies uniformly.
-- Legacy curricula.phases column is left intact for backward compatibility.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type lesson_block_type as enum ('text', 'video', 'image');
create type quiz_question_type as enum ('single_choice', 'multi_choice', 'true_false', 'short_answer');

-- ---------------------------------------------------------------------------
-- Content hierarchy
-- ---------------------------------------------------------------------------
create table curriculum_modules (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  branch_id uuid not null references branches(id),
  title text not null,
  description text,
  order_index int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index on curriculum_modules (curriculum_id, order_index);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references curriculum_modules(id) on delete cascade,
  branch_id uuid not null references branches(id),
  title text not null,
  order_index int not null default 0,
  estimated_minutes int,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index on lessons (module_id, order_index);

create table lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  branch_id uuid not null references branches(id),
  type lesson_block_type not null,
  order_index int not null default 0,
  -- text:  { "markdown": "..." }
  -- video: { "url": "https://youtu.be/..", "youtube_id": "..", "caption": ".." }
  -- image: { "url": "https://..", "caption": ".." }
  content jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on lesson_blocks (lesson_id, order_index);

-- ---------------------------------------------------------------------------
-- Quizzes — attach to exactly one of (module, lesson)
-- ---------------------------------------------------------------------------
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  branch_id uuid not null references branches(id),
  module_id uuid references curriculum_modules(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  title text not null default 'Quiz',
  pass_percentage int not null default 70,
  max_attempts int, -- null = unlimited
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  constraint quiz_single_owner check (num_nonnulls(module_id, lesson_id) = 1)
);
create index on quizzes (module_id);
create index on quizzes (lesson_id);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  branch_id uuid not null references branches(id),
  prompt text not null,
  type quiz_question_type not null,
  order_index int not null default 0,
  -- options: [{ "id": "a", "text": ".." }] for choice types; [] for short_answer / true_false
  options jsonb not null default '[]',
  -- correct: choice -> ["a","c"]; true_false -> [true]; short_answer -> ["accepted", "answers"]
  correct jsonb not null default '[]',
  points int not null default 1,
  explanation text,
  created_at timestamptz not null default now()
);
create index on quiz_questions (quiz_id, order_index);

-- ---------------------------------------------------------------------------
-- Student progress (student website is future; schema is ready now)
-- Students are separate from staff `profiles`. Student auth wiring is deferred.
-- ---------------------------------------------------------------------------
create table students (
  id uuid primary key references auth.users(id) on delete cascade,
  enrollment_id uuid references enrollments(id),
  branch_id uuid not null references branches(id),
  full_name text not null,
  email text,
  mobile text,
  created_at timestamptz not null default now()
);

create table student_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create table student_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  attempt_no int not null default 1,
  score numeric(5, 2) not null default 0,
  passed boolean not null default false,
  answers jsonb not null default '{}',
  submitted_at timestamptz not null default now()
);
create index on student_quiz_attempts (student_id, quiz_id);

create table student_module_completion (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  module_id uuid not null references curriculum_modules(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (student_id, module_id)
);

-- ---------------------------------------------------------------------------
-- RLS — admin/staff branch-scoped authoring (reuses auth.jwt_* helpers from 0002)
-- ---------------------------------------------------------------------------
alter table curriculum_modules enable row level security;
alter table lessons enable row level security;
alter table lesson_blocks enable row level security;
alter table quizzes enable row level security;
alter table quiz_questions enable row level security;
alter table students enable row level security;
alter table student_lesson_progress enable row level security;
alter table student_quiz_attempts enable row level security;
alter table student_module_completion enable row level security;

-- Content tables: super_admin all; branch users manage own branch; students read published.
create policy curriculum_modules_super_admin_all on curriculum_modules
  for all using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy curriculum_modules_branch_all on curriculum_modules
  for all using (branch_id = auth.jwt_branch_id()) with check (branch_id = auth.jwt_branch_id());
create policy curriculum_modules_student_read on curriculum_modules
  for select using (auth.jwt_role() = 'student' and is_published and branch_id = auth.jwt_branch_id());

create policy lessons_super_admin_all on lessons
  for all using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy lessons_branch_all on lessons
  for all using (branch_id = auth.jwt_branch_id()) with check (branch_id = auth.jwt_branch_id());
create policy lessons_student_read on lessons
  for select using (auth.jwt_role() = 'student' and is_published and branch_id = auth.jwt_branch_id());

create policy lesson_blocks_super_admin_all on lesson_blocks
  for all using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy lesson_blocks_branch_all on lesson_blocks
  for all using (branch_id = auth.jwt_branch_id()) with check (branch_id = auth.jwt_branch_id());
create policy lesson_blocks_student_read on lesson_blocks
  for select using (auth.jwt_role() = 'student' and branch_id = auth.jwt_branch_id());

create policy quizzes_super_admin_all on quizzes
  for all using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy quizzes_branch_all on quizzes
  for all using (branch_id = auth.jwt_branch_id()) with check (branch_id = auth.jwt_branch_id());
create policy quizzes_student_read on quizzes
  for select using (auth.jwt_role() = 'student' and branch_id = auth.jwt_branch_id());

-- Questions readable by students WITHOUT the `correct` column — enforce that in
-- the student API layer (server-side grading), not here. Row-level read is allowed.
create policy quiz_questions_super_admin_all on quiz_questions
  for all using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy quiz_questions_branch_all on quiz_questions
  for all using (branch_id = auth.jwt_branch_id()) with check (branch_id = auth.jwt_branch_id());
create policy quiz_questions_student_read on quiz_questions
  for select using (auth.jwt_role() = 'student' and branch_id = auth.jwt_branch_id());

-- Student tables: super_admin/staff read within branch; each student owns their rows.
create policy students_super_admin_all on students
  for all using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy students_branch_read on students
  for select using (branch_id = auth.jwt_branch_id());
create policy students_self on students
  for select using (id = auth.uid());

create policy slp_super_admin_all on student_lesson_progress
  for all using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy slp_self on student_lesson_progress
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy sqa_super_admin_all on student_quiz_attempts
  for all using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy sqa_self on student_quiz_attempts
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy smc_super_admin_all on student_module_completion
  for all using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy smc_self on student_module_completion
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
