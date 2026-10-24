-- ============================================================
-- Migration 002: Department Admin Isolation
-- Enforces strict role-based data isolation so Department Admins
-- can only view, manage, and download data from their assigned department.
-- Super Admins retain full access to all departments and data.
-- ============================================================

-- 1. PRESENTATIONS POLICIES
DROP POLICY IF EXISTS "Admins can view all presentations" ON public.presentations;
DROP POLICY IF EXISTS "Super admins can view all presentations" ON public.presentations;
CREATE POLICY "Super admins can view all presentations" ON public.presentations
  FOR SELECT USING (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Dept admins can view own dept presentations" ON public.presentations;
CREATE POLICY "Dept admins can view own dept presentations" ON public.presentations
  FOR SELECT USING (
    public.current_user_role() = 'department_admin'
    AND department_id = public.current_user_department()
  );

DROP POLICY IF EXISTS "Admins can delete presentations" ON public.presentations;
DROP POLICY IF EXISTS "Super admins can delete presentations" ON public.presentations;
CREATE POLICY "Super admins can delete presentations" ON public.presentations
  FOR DELETE USING (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Dept admins can delete own dept presentations" ON public.presentations;
CREATE POLICY "Dept admins can delete own dept presentations" ON public.presentations
  FOR DELETE USING (
    public.current_user_role() = 'department_admin'
    AND department_id = public.current_user_department()
  );

DROP POLICY IF EXISTS "Admins can update presentations" ON public.presentations;
DROP POLICY IF EXISTS "Super admins can update presentations" ON public.presentations;
CREATE POLICY "Super admins can update presentations" ON public.presentations
  FOR UPDATE USING (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Dept admins can update own dept presentations" ON public.presentations;
CREATE POLICY "Dept admins can update own dept presentations" ON public.presentations
  FOR UPDATE USING (
    public.current_user_role() = 'department_admin'
    AND department_id = public.current_user_department()
  );

-- 2. RESOURCES POLICIES
DROP POLICY IF EXISTS "Admins can insert resources" ON public.resources;
CREATE POLICY "Admins can insert resources" ON public.resources
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (
      public.current_user_role() = 'department_admin'
      AND department_id = public.current_user_department()
    )
  );

-- 3. AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Admins can read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admins can read audit_logs" ON public.audit_logs;
CREATE POLICY "Super admins can read audit_logs" ON public.audit_logs
  FOR SELECT USING (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Dept admins can read own dept audit_logs" ON public.audit_logs;
CREATE POLICY "Dept admins can read own dept audit_logs" ON public.audit_logs
  FOR SELECT USING (
    public.current_user_role() = 'department_admin'
    AND department_id = public.current_user_department()
  );

-- 4. SECTIONS & SUBJECTS POLICIES (Department Admins can manage their own department structure)
DROP POLICY IF EXISTS "Dept admins can modify own dept sections" ON public.sections;
CREATE POLICY "Dept admins can modify own dept sections" ON public.sections
  FOR ALL USING (
    public.current_user_role() = 'department_admin'
    AND department_id = public.current_user_department()
  );

DROP POLICY IF EXISTS "Dept admins can modify own dept subjects" ON public.subjects;
CREATE POLICY "Dept admins can modify own dept subjects" ON public.subjects
  FOR ALL USING (
    public.current_user_role() = 'department_admin'
    AND department_id = public.current_user_department()
  );
