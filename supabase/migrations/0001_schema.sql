-- Meraki Portal — core schema
-- All business tables carry branch_id and are covered by RLS (see 0002_rls.sql)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------
create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create type user_role as enum ('super_admin', 'branch_admin', 'staff', 'custom');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  branch_id uuid references branches(id),
  full_name text not null,
  email text not null,
  mobile text,
  role user_role not null default 'staff',
  modules text[] not null default '{}',
  permission_level text not null default 'custom',
  last_login timestamptz,
  registered_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- super_admin rows don't need a branch_id; everyone else must have one
alter table profiles add constraint branch_required_unless_super_admin
  check (role = 'super_admin' or branch_id is not null);

-- ---------------------------------------------------------------------------
-- enquiries
-- ---------------------------------------------------------------------------
create type enquiry_status as enum ('New', 'Contacted', 'Interested', 'Converted');

create table enquiries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  student_name text not null,
  mobile text not null,
  program text not null,
  year_of_study text,
  reference_source text,
  status enquiry_status not null default 'New',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  converted_enrollment_id uuid
);

-- ---------------------------------------------------------------------------
-- batches
-- ---------------------------------------------------------------------------
create type batch_mode as enum ('Online', 'Offline', 'Hybrid');
create type batch_status as enum ('Upcoming', 'Active', 'Completed');

create table batches (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  batch_name text not null,
  program text not null,
  trainer text,
  start_date date,
  end_date date,
  seats_total int not null default 0,
  seats_filled int not null default 0,
  mode batch_mode not null default 'Offline',
  status batch_status not null default 'Upcoming',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ---------------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------------
create type fee_status as enum ('Paid', 'Partial', 'Pending');

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  student_name text not null,
  mobile text not null,
  program text not null,
  year_of_study text,
  batch_id uuid references batches(id),
  total_fee numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  pending_amount numeric(12,2) generated always as (total_fee - paid_amount) stored,
  fee_status fee_status not null default 'Pending',
  enquiry_id uuid references enquiries(id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table enquiries
  add constraint enquiries_converted_enrollment_fk
  foreign key (converted_enrollment_id) references enrollments(id);

-- ---------------------------------------------------------------------------
-- curricula
-- ---------------------------------------------------------------------------
create type curriculum_status as enum ('Draft', 'Published');

create table curricula (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  program text not null,
  title text not null,
  status curriculum_status not null default 'Draft',
  phases jsonb not null default '[]', -- [{id,title,description,order,estimated_duration}]
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ---------------------------------------------------------------------------
-- batch_execution
-- ---------------------------------------------------------------------------
create table batch_execution (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  batch_id uuid not null references batches(id),
  curriculum_id uuid not null references curricula(id),
  phase_progress jsonb not null default '[]', -- [{phase_id,status,notes,completed_at}]
  progress_pct numeric(5,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (batch_id)
);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create type expense_status as enum ('Pending', 'Approved');

create table expenses (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  title text not null,
  category text not null,
  amount numeric(12,2) not null,
  vendor text,
  date date not null default current_date,
  notes text,
  status expense_status not null default 'Pending',
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- campaigns / email / whatsapp / lead sources
-- ---------------------------------------------------------------------------
create type campaign_type as enum ('Email', 'WhatsApp', 'General');
create type campaign_status as enum ('Draft', 'Active', 'Completed');

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  name text not null,
  type campaign_type not null default 'General',
  target_audience text,
  program text,
  budget numeric(12,2) default 0,
  leads_generated int not null default 0,
  status campaign_status not null default 'Draft',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table email_campaigns (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  campaign_id uuid references campaigns(id),
  subject text not null,
  content text not null,
  recipients_count int not null default 0,
  sent_at timestamptz,
  delivered_count int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table whatsapp_blasts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  campaign_id uuid references campaigns(id),
  content text not null,
  recipients_count int not null default 0,
  sent_at timestamptz,
  delivered_count int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table lead_sources (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  source_name text not null,
  count int not null default 0,
  unique (branch_id, source_name)
);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  branch_id uuid references branches(id),
  action text not null,        -- create / update / delete / approve / etc
  entity text not null,        -- table/entity name
  entity_id uuid,
  details jsonb,
  timestamp timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- indices
-- ---------------------------------------------------------------------------
create index on enquiries (branch_id);
create index on enrollments (branch_id);
create index on batches (branch_id);
create index on curricula (branch_id);
create index on batch_execution (branch_id);
create index on expenses (branch_id);
create index on campaigns (branch_id);
create index on email_campaigns (branch_id);
create index on whatsapp_blasts (branch_id);
create index on lead_sources (branch_id);
create index on audit_log (branch_id);
create index on profiles (branch_id);
