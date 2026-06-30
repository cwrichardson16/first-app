-- One-time fix. After `drop schema public cascade; create schema public;`
-- Supabase's default table grants were wiped — the authenticated role had no
-- base INSERT/SELECT permission, so every write hit "permission denied for
-- table <name>" before RLS could evaluate. Restore grants on existing objects
-- and reset default privileges for future ones.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
