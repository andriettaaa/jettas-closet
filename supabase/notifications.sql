-- Notifications and Apple Pay for A’s Life. Run once in Supabase → SQL Editor.
-- Replace CRON_SECRET_HERE with your own cron secret (the same value you set as the CRON_SECRET secret
-- of the notify function). Never commit the real value.

-- the devices that get notifications
create table if not exists public.push_subs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  device text,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "Your own devices" on public.push_subs;
create policy "Your own devices" on public.push_subs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- what was already sent, so nothing arrives twice; only the edge functions read it
create table if not exists public.push_log (
  user_id uuid not null references auth.users on delete cascade,
  slot text not null,
  day text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, slot, day)
);
alter table public.push_log enable row level security;

-- every 5 minutes the notify function checks whose notification is due
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('as-life-notify') where exists (select 1 from cron.job where jobname = 'as-life-notify');
select cron.schedule('as-life-notify', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://lrmfsuqbewrelpeozneg.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'CRON_SECRET_HERE'),
    body := '{}'::jsonb
  );
$$);
