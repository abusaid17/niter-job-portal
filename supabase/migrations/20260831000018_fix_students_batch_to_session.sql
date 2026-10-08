-- ============================================================
-- NITER Job Portal — Fix students.batch → session
-- Rename column to match frontend field name and planning doc
-- ============================================================

ALTER TABLE public.students RENAME COLUMN batch TO session;