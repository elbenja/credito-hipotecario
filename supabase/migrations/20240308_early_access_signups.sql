-- Create the early_access_signups table
create table if not exists early_access_signups (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  language text not null default 'en',
  ip_address text,
  status text not null default 'unverified',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  verified_at timestamp with time zone,
  last_notification_at timestamp with time zone
);

-- Create policy to allow anyone to insert
create policy "Anyone can sign up for early access" on early_access_signups
  for insert with check (true);

-- Create policy to allow only authenticated users to view all records (for admin dashboard)
create policy "Only authenticated users can view signups" on early_access_signups
  for select using (auth.role() = 'authenticated');

-- Enable RLS
alter table early_access_signups enable row level security;

-- Create index on email for faster lookups and uniqueness checks
create index early_access_signups_email_idx on early_access_signups (email);

-- Create index on status for filtering in admin dashboard
create index early_access_signups_status_idx on early_access_signups (status); 