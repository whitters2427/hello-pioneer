alter table notes enable row level security;

create policy "Anyone can read notes"
  on notes for select
  to public
  using (true);

create policy "Anyone can add notes"
  on notes for insert
  to public
  with check (true);
