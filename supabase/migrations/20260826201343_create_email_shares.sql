create table email_shares (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes(id) on delete cascade,
  resend_email_id text unique not null,
  recipient text not null,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table email_shares enable row level security;

create policy "Anyone can read email status"
  on email_shares for select
  to public
  using (true);

alter publication supabase_realtime add table email_shares;
