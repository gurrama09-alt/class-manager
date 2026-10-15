// ─────────────────────────────────────────────────────────────────────────────
// Complete TypeScript types for all Supabase database tables
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'department_admin' | 'student'
export type AdminStatus = 'invited' | 'active' | 'deactivated'
export type ResourceCategory = 'question_bank' | 'lab_manual' | 'assignments' | 'syllabus'
export type AuditAction =
  | 'resource_upload'
  | 'resource_edit'
  | 'resource_delete'
  | 'resource_download'
  | 'presentation_submit'
  | 'presentation_replace'
  | 'presentation_delete'
  | 'presentation_download'
  | 'structure_create'
  | 'structure_edit'
  | 'structure_delete'
  | 'admin_invite'
  | 'admin_activate'
  | 'admin_deactivate'
  | 'admin_remove'
  | 'settings_update'
  | 'login'
  | 'logout'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  department_id: string | null
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  department_id: string
  name: string
  code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  department?: Department
}

export interface Subject {
  id: string
  department_id: string
  name: string
  code: string
  semester: number
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  department?: Department
  sections?: Section[]
}

export interface SubjectSection {
  subject_id: string
  section_id: string
}

export interface AcademicSettings {
  id: string
  academic_year: string
  expected_student_count: number
  allow_resubmission: boolean
  max_ppt_size_mb: number
  max_resource_size_mb: number
  required_subjects: string[]
  completion_policy: string
  updated_at: string
  updated_by: string | null
}

export interface AdminAuthorization {
  id: string
  email: string
  role: UserRole
  department_id: string | null
  status: AdminStatus
  invited_by: string | null
  invited_at: string
  activated_at: string | null
  updated_at: string
  // joined
  department?: Department
}

export interface Resource {
  id: string
  title: string
  category: ResourceCategory
  department_id: string | null
  section_id: string | null
  subject_id: string | null
  semester: number | null
  unit_number: number | null
  sequence_number: number
  academic_year: string
  description: string | null
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  download_count: number
  uploaded_by: string | null
  created_at: string
  updated_at: string
  // joined
  department?: Department
  section?: Section
  subject?: Subject
  uploader?: UserProfile
}

export interface Presentation {
  id: string
  student_name: string
  roll_number: number
  section_id: string | null
  subject_id: string | null
  academic_year: string
  file_name: string
  file_size: number
  storage_path: string
  is_latest: boolean
  submitted_at: string
  submitted_by: string | null
  department_id: string | null
  // joined
  section?: Section
  subject?: Subject
  department?: Department
}

export interface AuditLog {
  id: string
  action: AuditAction
  actor_id: string | null
  actor_email: string | null
  entity_type: string | null
  entity_id: string | null
  entity_name: string | null
  department_id: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  // joined
  department?: Department
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  ip_address: string | null
  created_at: string
}

// ── Supabase Database type (for generated client types) ──────────────────────
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile
        Insert: Partial<UserProfile> & { id: string; email: string }
        Update: Partial<UserProfile>
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Department, 'id' | 'created_at'>>
      }
      sections: {
        Row: Section
        Insert: Omit<Section, 'id' | 'created_at' | 'updated_at' | 'department'>
        Update: Partial<Omit<Section, 'id' | 'created_at' | 'department'>>
      }
      subjects: {
        Row: Subject
        Insert: Omit<Subject, 'id' | 'created_at' | 'updated_at' | 'department' | 'sections'>
        Update: Partial<Omit<Subject, 'id' | 'created_at' | 'department' | 'sections'>>
      }
      subject_sections: {
        Row: SubjectSection
        Insert: SubjectSection
        Update: Partial<SubjectSection>
      }
      academic_settings: {
        Row: AcademicSettings
        Insert: Partial<AcademicSettings>
        Update: Partial<AcademicSettings>
      }
      admin_authorizations: {
        Row: AdminAuthorization
        Insert: Omit<AdminAuthorization, 'id' | 'invited_at' | 'updated_at' | 'department'>
        Update: Partial<Omit<AdminAuthorization, 'id' | 'department'>>
      }
      resources: {
        Row: Resource
        Insert: Omit<Resource, 'id' | 'created_at' | 'updated_at' | 'department' | 'section' | 'subject' | 'uploader'>
        Update: Partial<Omit<Resource, 'id' | 'created_at' | 'department' | 'section' | 'subject' | 'uploader'>>
      }
      presentations: {
        Row: Presentation
        Insert: Omit<Presentation, 'id' | 'submitted_at' | 'section' | 'subject' | 'department'>
        Update: Partial<Omit<Presentation, 'id' | 'section' | 'subject' | 'department'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at' | 'department'>
        Update: never
      }
      contact_messages: {
        Row: ContactMessage
        Insert: Omit<ContactMessage, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      admin_status: AdminStatus
      resource_category: ResourceCategory
      audit_action: AuditAction
    }
  }
}
