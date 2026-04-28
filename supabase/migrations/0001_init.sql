-- TaskFlow schema: boards → columns → cards
-- Ordering uses fractional-index strings (text), sorted lexicographically.
-- Authorization is enforced by Row Level Security at the database level —
-- the application layer does NOT need to filter by user.

create extension if not exists "pgcrypto";

create table if not exists public.boards (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  created_at  timestamptz not null default now()
);

create index if not exists boards_owner_idx on public.boards(owner_id, created_at desc);

create table if not exists public.columns (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  position    text not null,
  created_at  timestamptz not null default now()
);

create index if not exists columns_board_position_idx
  on public.columns(board_id, position);

create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  column_id   uuid not null references public.columns(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  description text,
  position    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists cards_column_position_idx
  on public.cards(column_id, position);

-- Auto-update cards.updated_at on every row update.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_touch_updated_at on public.cards;
create trigger cards_touch_updated_at
  before update on public.cards
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row Level Security
--
-- Every table has RLS enabled. Policies traverse the foreign-key chain so we
-- only need to check ownership at the boards table; columns and cards inherit.
-- ============================================================================

alter table public.boards  enable row level security;
alter table public.columns enable row level security;
alter table public.cards   enable row level security;

-- BOARDS: owner can do anything with their own boards.
drop policy if exists boards_owner_all on public.boards;
create policy boards_owner_all on public.boards
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- COLUMNS: must belong to a board owned by the current user.
drop policy if exists columns_owner_all on public.columns;
create policy columns_owner_all on public.columns
  for all
  using (
    exists (
      select 1 from public.boards b
      where b.id = columns.board_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.boards b
      where b.id = columns.board_id and b.owner_id = auth.uid()
    )
  );

-- CARDS: must belong to a column whose board is owned by the current user.
drop policy if exists cards_owner_all on public.cards;
create policy cards_owner_all on public.cards
  for all
  using (
    exists (
      select 1
      from public.columns c
      join public.boards  b on b.id = c.board_id
      where c.id = cards.column_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.columns c
      join public.boards  b on b.id = c.board_id
      where c.id = cards.column_id and b.owner_id = auth.uid()
    )
  );
