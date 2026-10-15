-- ============================================================
-- CLASS MANAGEMENT – Complete Supabase Database Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'department_admin', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE admin_status AS ENUM ('invited', 'active', 'deactivated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resource_category AS ENUM ('question_bank', 'lab_manual', 'assignments', 'syllabus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'resource_upload', 'resource_edit', 'resource_delete', 'resource_download',
    'presentation_submit', 'presentation_replace', 'presentation_delete', 'presentation_download',
    'structure_create', 'structure_edit', 'structure_delete',
    'admin_invite', 'admin_activate', 'admin_deactivate', 'admin_remove',
    'settings_update', 'login', 'logout'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. USER PROFILES & ROLES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'student',
  department_id UUID,  -- FK added after departments table
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 3. ACADEMIC STRUCTURE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now we can add the FK for user_profiles.department_id
ALTER TABLE public.user_profiles
  ADD CONSTRAINT IF NOT EXISTS fk_user_profiles_department
  FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.sections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, name)
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL,
  semester      INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, code)
);

-- Subject ↔ Section mapping (many-to-many)
CREATE TABLE IF NOT EXISTS public.subject_sections (
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  PRIMARY KEY (subject_id, section_id)
);

-- ─────────────────────────────────────────────────────────────
-- 4. ACADEMIC SETTINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academic_settings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year           TEXT NOT NULL DEFAULT '2024-25',
  expected_student_count  INTEGER NOT NULL DEFAULT 60,
  allow_resubmission      BOOLEAN NOT NULL DEFAULT FALSE,
  max_ppt_size_mb         INTEGER NOT NULL DEFAULT 100,
  max_resource_size_mb    INTEGER NOT NULL DEFAULT 50,
  required_subjects       TEXT[] DEFAULT '{}',   -- subject IDs or codes
  completion_policy       TEXT NOT NULL DEFAULT 'all',  -- 'all' | 'any'
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by              UUID REFERENCES public.user_profiles(id)
);

-- Ensure only one settings row
INSERT INTO public.academic_settings (academic_year) VALUES ('2024-25')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 5. ADMINISTRATOR AUTHORIZATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_authorizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'department_admin',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  status        admin_status NOT NULL DEFAULT 'invited',
  invited_by    UUID REFERENCES public.user_profiles(id),
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

-- ─────────────────────────────────────────────────────────────
-- 6. STUDY RESOURCES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  category        resource_category NOT NULL,
  department_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  section_id      UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id      UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  semester        INTEGER CHECK (semester BETWEEN 1 AND 8),
  unit_number     INTEGER,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  academic_year   TEXT NOT NULL DEFAULT '2024-25',
  description     TEXT,
  file_name       TEXT NOT NULL,
  file_size       BIGINT NOT NULL DEFAULT 0,
  file_type       TEXT NOT NULL,
  storage_path    TEXT NOT NULL UNIQUE,
  download_count  INTEGER NOT NULL DEFAULT 0,
  uploaded_by     UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_department ON public.resources(department_id);
CREATE INDEX IF NOT EXISTS idx_resources_academic_year ON public.resources(academic_year);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON public.resources(subject_id);
CREATE INDEX IF NOT EXISTS idx_resources_sequence ON public.resources(department_id, category, sequence_number);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_resources_fts ON public.resources
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));

-- ─────────────────────────────────────────────────────────────
-- 7. PRESENTATION SUBMISSIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.presentations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_name   TEXT NOT NULL,
  roll_number    INTEGER NOT NULL CHECK (roll_number BETWEEN 1 AND 200),
  section_id     UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id     UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  academic_year  TEXT NOT NULL DEFAULT '2024-25',
  file_name      TEXT NOT NULL,
  file_size      BIGINT NOT NULL DEFAULT 0,
  storage_path   TEXT NOT NULL,
  is_latest      BOOLEAN NOT NULL DEFAULT TRUE,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_by   UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  department_id  UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  UNIQUE (roll_number, subject_id, academic_year, is_latest)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_presentations_subject ON public.presentations(subject_id);
CREATE INDEX IF NOT EXISTS idx_presentations_section ON public.presentations(section_id);
CREATE INDEX IF NOT EXISTS idx_presentations_academic_year ON public.presentations(academic_year);
CREATE INDEX IF NOT EXISTS idx_presentations_roll ON public.presentations(roll_number);
CREATE INDEX IF NOT EXISTS idx_presentations_is_latest ON public.presentations(is_latest);

-- ─────────────────────────────────────────────────────────────
-- 8. AUDIT LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action        audit_action NOT NULL,
  actor_id      UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_email   TEXT,
  entity_type   TEXT,
  entity_id     UUID,
  entity_name   TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  description   TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────
-- 9. CONTACT MESSAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 10. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role user_role := 'student';
  v_dept UUID := NULL;
  v_auth RECORD;
BEGIN
  -- Check if this email is in admin_authorizations
  SELECT * INTO v_auth FROM public.admin_authorizations
    WHERE email = NEW.email AND status IN ('invited', 'active')
    LIMIT 1;

  IF FOUND THEN
    v_role := v_auth.role;
    v_dept := v_auth.department_id;
    -- Mark as active
    UPDATE public.admin_authorizations
      SET status = 'active', activated_at = NOW()
      WHERE id = v_auth.id;
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, role, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    v_dept
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- updated_at auto-update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'user_profiles','departments','sections','subjects',
    'resources','academic_settings','admin_authorizations'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();', t, t);
  END LOOP;
END $$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Helper: get current user's department
CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────
-- 11. ROW LEVEL SECURITY POLICIES
-- ─────────────────────────────────────────────────────────────

-- user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (public.current_user_role() IN ('super_admin', 'department_admin'));
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.user_profiles;
CREATE POLICY "Super admins can update any profile" ON public.user_profiles
  FOR UPDATE USING (public.current_user_role() = 'super_admin');

-- departments (public read)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can read departments" ON public.departments;
CREATE POLICY "Anyone authenticated can read departments" ON public.departments
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Super admins can modify departments" ON public.departments;
CREATE POLICY "Super admins can modify departments" ON public.departments
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- sections
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read sections" ON public.sections;
CREATE POLICY "Authenticated can read sections" ON public.sections
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Super admins can modify sections" ON public.sections;
CREATE POLICY "Super admins can modify sections" ON public.sections
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read subjects" ON public.subjects;
CREATE POLICY "Authenticated can read subjects" ON public.subjects
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Super admins can modify subjects" ON public.subjects;
CREATE POLICY "Super admins can modify subjects" ON public.subjects
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- subject_sections
ALTER TABLE public.subject_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read subject_sections" ON public.subject_sections;
CREATE POLICY "Authenticated can read subject_sections" ON public.subject_sections
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Super admins manage subject_sections" ON public.subject_sections;
CREATE POLICY "Super admins manage subject_sections" ON public.subject_sections
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- academic_settings
ALTER TABLE public.academic_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read settings" ON public.academic_settings;
CREATE POLICY "Authenticated can read settings" ON public.academic_settings
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Super admins can modify settings" ON public.academic_settings;
CREATE POLICY "Super admins can modify settings" ON public.academic_settings
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read resources" ON public.resources;
CREATE POLICY "Authenticated can read resources" ON public.resources
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can insert resources" ON public.resources;
CREATE POLICY "Admins can insert resources" ON public.resources
  FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'department_admin'));
DROP POLICY IF EXISTS "Super admins can update resources" ON public.resources;
CREATE POLICY "Super admins can update resources" ON public.resources
  FOR UPDATE USING (public.current_user_role() = 'super_admin');
DROP POLICY IF EXISTS "Dept admins can update own dept resources" ON public.resources;
CREATE POLICY "Dept admins can update own dept resources" ON public.resources
  FOR UPDATE USING (
    public.current_user_role() = 'department_admin'
    AND department_id = public.current_user_department()
  );
DROP POLICY IF EXISTS "Super admins can delete resources" ON public.resources;
CREATE POLICY "Super admins can delete resources" ON public.resources
  FOR DELETE USING (public.current_user_role() = 'super_admin');
DROP POLICY IF EXISTS "Dept admins can delete own dept resources" ON public.resources;
CREATE POLICY "Dept admins can delete own dept resources" ON public.resources
  FOR DELETE USING (
    public.current_user_role() = 'department_admin'
    AND department_id = public.current_user_department()
  );

-- presentations
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students can insert own presentations" ON public.presentations;
CREATE POLICY "Students can insert own presentations" ON public.presentations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Students can view own presentations" ON public.presentations;
CREATE POLICY "Students can view own presentations" ON public.presentations
  FOR SELECT USING (submitted_by = auth.uid());
DROP POLICY IF EXISTS "Admins can view all presentations" ON public.presentations;
CREATE POLICY "Admins can view all presentations" ON public.presentations
  FOR SELECT USING (public.current_user_role() IN ('super_admin', 'department_admin'));
DROP POLICY IF EXISTS "Admins can delete presentations" ON public.presentations;
CREATE POLICY "Admins can delete presentations" ON public.presentations
  FOR DELETE USING (public.current_user_role() IN ('super_admin', 'department_admin'));
DROP POLICY IF EXISTS "Admins can update presentations" ON public.presentations;
CREATE POLICY "Admins can update presentations" ON public.presentations
  FOR UPDATE USING (public.current_user_role() IN ('super_admin', 'department_admin'));

-- admin_authorizations
ALTER TABLE public.admin_authorizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins can manage admin_authorizations" ON public.admin_authorizations;
CREATE POLICY "Super admins can manage admin_authorizations" ON public.admin_authorizations
  FOR ALL USING (public.current_user_role() = 'super_admin');
DROP POLICY IF EXISTS "Admins can view own record" ON public.admin_authorizations;
CREATE POLICY "Admins can view own record" ON public.admin_authorizations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- audit_logs (insert by backend, read by admins, no delete)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit_logs" ON public.audit_logs
  FOR SELECT USING (public.current_user_role() IN ('super_admin', 'department_admin'));
DROP POLICY IF EXISTS "Backend can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Backend can insert audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK (TRUE);

-- contact_messages (insert anyone, read by super admins)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages
  FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Super admins can read contact messages" ON public.contact_messages;
CREATE POLICY "Super admins can read contact messages" ON public.contact_messages
  FOR SELECT USING (public.current_user_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────
-- 12. STORAGE BUCKETS (run separately in Supabase dashboard if needed)
-- ─────────────────────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES
--   ('presentations', 'presentations', FALSE, 104857600, ARRAY['application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']),
--   ('resources', 'resources', FALSE, 52428800, NULL)
-- ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 13. STORAGE RLS (run in Supabase dashboard Storage section)
-- ─────────────────────────────────────────────────────────────
-- presentations bucket: authenticated upload, admin download
-- resources bucket: admin upload, authenticated download

-- END OF MIGRATION
