// ─────────────────────────────────────────────────────────────────────────────
// Zod validation schemas for all forms and API inputs
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod'

// ── Auth ─────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Roll number or email is required'),
  password: z.string().min(1, 'Password is required'),
})

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// ── Presentation Upload ───────────────────────────────────────────────────────
export const PresentationSubmitSchema = z.object({
  student_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  roll_number: z.number().int().min(1, 'Roll number must be between 1 and 200').max(200),
  section_id: z.string().uuid('Please select a section'),
  subject_id: z.string().uuid('Please select a subject'),
  academic_year: z.string().min(4),
})

// ── Resource Upload ───────────────────────────────────────────────────────────
export const ResourceUploadSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  category: z.enum(['question_bank', 'lab_manual', 'assignments', 'syllabus']),
  department_id: z.string().uuid('Please select a department'),
  section_id: z.string().uuid().nullable().optional(),
  subject_id: z.string().uuid().nullable().optional(),
  semester: z.number().int().min(1).max(8).nullable().optional(),
  unit_number: z.number().int().min(1).max(30).nullable().optional(),
  sequence_number: z.number().int().min(1).max(9999).default(1),
  academic_year: z.string().min(4),
  description: z.string().max(500).nullable().optional(),
})

// ── Department ────────────────────────────────────────────────────────────────
export const DepartmentSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(20).toUpperCase(),
})

// ── Section ───────────────────────────────────────────────────────────────────
export const SectionSchema = z.object({
  department_id: z.string().uuid('Please select a department'),
  name: z.string().min(1, 'Section name is required').max(50),
  code: z.string().max(20).optional(),
})

// ── Subject ───────────────────────────────────────────────────────────────────
export const SubjectSchema = z.object({
  department_id: z.string().uuid('Please select a department'),
  name: z.string().min(2, 'Subject name is required').max(100),
  code: z.string().min(1, 'Code is required').max(20),
  semester: z.number().int().min(1).max(8),
  is_active: z.boolean().default(true),
  section_ids: z.array(z.string().uuid()).optional(),
})

// ── Admin Invitation ──────────────────────────────────────────────────────────
export const AdminInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['super_admin', 'department_admin']),
  department_id: z.string().uuid().nullable().optional(),
})

// ── Academic Settings ─────────────────────────────────────────────────────────
export const AcademicSettingsSchema = z.object({
  academic_year: z.string().min(4, 'Academic year required'),
  expected_student_count: z.number().int().min(1).max(1000),
  allow_resubmission: z.boolean(),
  max_ppt_size_mb: z.number().int().min(1).max(500),
  max_resource_size_mb: z.number().int().min(1).max(500),
  completion_policy: z.enum(['all', 'any']),
})

// ── Contact Form ──────────────────────────────────────────────────────────────
export const ContactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(2, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
})
