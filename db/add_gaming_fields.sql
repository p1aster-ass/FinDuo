-- Adds the onboarding fields to public.profiles.
-- The live table already has all five columns (confirmed 2026-09-26). Kept for
-- other Neon branches; the column step is safe to re-run, the constraint is not.

alter table public.profiles
  add column if not exists games text[] not null default '{}',
  add column if not exists rank text,
  add column if not exists comm_styles text[] not null default '{}',
  add column if not exists roles text[] not null default '{}',
  add column if not exists availability text[] not null default '{}';

alter table public.profiles
  add constraint profiles_rank_check check (
    rank is null
    or rank in ('Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal')
  );

-- After any column change, refresh the Data API schema cache (Neon Console →
-- Data API → Refresh schema cache). Until then the Data API rejects the new
-- columns with PGRST204 "column ... does not exist", even though Postgres has them.

-- Access grants and row-level security policies: see db/profiles_access.sql.
