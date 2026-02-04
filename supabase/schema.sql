create table if not exists public.sms_queue (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  message text not null,
  status text not null default 'queued',
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_queue_status_idx on public.sms_queue (status);
create index if not exists sms_queue_created_at_idx on public.sms_queue (created_at);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sms_queue_set_updated_at
before update on public.sms_queue
for each row execute function public.set_updated_at();
