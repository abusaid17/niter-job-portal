-- ============================================================
-- NITER Job Portal — Explicit grants for service_role on public
--
-- Belt-and-braces: service_role bypasses RLS, but explicit grants
-- make backend/edge-function access independent of any earlier
-- REVOKE or restrictive default privileges. Read-only for clients;
-- service_role key must still never be exposed to the browser.
-- Idempotent: GRANT/ALTER DEFAULT PRIVILEGES are naturally
-- re-runnable. Apply with: supabase db push (NOT run by agents).
-- ============================================================

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant all on sequences to service_role;

alter default privileges in schema public
  grant all on functions to service_role;
