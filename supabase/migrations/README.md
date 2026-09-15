# SQL migrations

Apply in order:

- `20260831000001_initial_schema.sql` — ENUMs, all tables, constraints, indexes
- `20260831000002_rls_policies.sql`  — Row Level Security policies, helpers, grants
- `20260831000003_storage_policies.sql` — Storage bucket + upload policies
- `20260831000004_recruiter_support.sql` — Recruiter module (Step 5)
- `20260831000005_guard_fix.sql` — workflow guard fixes
- `20260831000006_alumni_applications.sql` — Alumni applications (Step 6)
- `20260831000007_alumni_referral_read.sql` — Alumni referral read policies
- `20260831000008_faculty_support.sql` — Faculty module (Step 7)
- `20260831000009_faculty_guard_fix.sql` — Faculty guard fixes
- `20260831000010_faculty_guard_strict.sql` — Stricter faculty guards
- `20260831000011_admin_support.sql` — Admin module (Step 8)
- `20260831000012_messaging_notifications.sql` — Messaging + notifications (Step 9)
- `20260831000013_phase2_features.sql` — Phase-2 gaps (Step 4-2): job report admin updates, job search columns (department, experience_level, skills, education, benefits)

Migrations are validated against local PostgreSQL (via Docker) before pushing to the remote Supabase project.
