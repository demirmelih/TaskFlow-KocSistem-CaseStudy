-- Add deadline, responsible_name, and responsible_email to cards.
-- Run this in the Supabase SQL editor after 0001_init.sql.

alter table public.cards
  add column if not exists deadline          timestamptz,
  add column if not exists responsible_name  text check (char_length(responsible_name) <= 200),
  add column if not exists responsible_email text check (char_length(responsible_email) <= 200);
