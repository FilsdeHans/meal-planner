-- Enable RLS on household_staples (safe to run even if already enabled)
alter table household_staples enable row level security;

-- Household members can read their own household's staples and prompts
create policy "household members can read staples"
  on household_staples
  for select
  using (
    household_id in (
      select household_id
      from household_members
      where user_id = auth.uid()
    )
  );
