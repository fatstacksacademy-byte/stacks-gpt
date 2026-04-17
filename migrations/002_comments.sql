-- Blog comments table
-- Supports both authenticated Stacks OS users and guest commenters (email-only)

create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  slug text not null,                    -- blog post slug (e.g. "chase-400-checking-bonus")
  user_id uuid references auth.users(id) on delete set null,  -- null for guest commenters
  display_name text not null,            -- shown publicly
  email text,                            -- guest email (not shown publicly), null for auth users
  body text not null,
  parent_id uuid references public.comments(id) on delete cascade,  -- for threaded replies
  created_at timestamptz default now() not null
);

-- Indexes
create index if not exists idx_comments_slug on public.comments(slug, created_at);
create index if not exists idx_comments_parent on public.comments(parent_id);

-- RLS policies
alter table public.comments enable row level security;

-- Anyone can read comments
create policy "Comments are publicly readable"
  on public.comments for select
  using (true);

-- Authenticated users can insert
create policy "Authenticated users can comment"
  on public.comments for insert
  with check (auth.uid() = user_id);

-- Guest comments (user_id is null, email required)
create policy "Guests can comment with email"
  on public.comments for insert
  with check (user_id is null and email is not null);

-- Users can delete their own comments
create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);
