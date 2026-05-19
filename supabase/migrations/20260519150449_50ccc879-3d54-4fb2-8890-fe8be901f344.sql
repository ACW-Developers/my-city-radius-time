
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Remove any prior version of the job
do $$
begin
  if exists (select 1 from cron.job where jobname = 'auto-checkout-6pm-az') then
    perform cron.unschedule('auto-checkout-6pm-az');
  end if;
end $$;

-- 6 PM America/Phoenix == 01:00 UTC (Arizona does not observe DST)
select cron.schedule(
  'auto-checkout-6pm-az',
  '0 1 * * *',
  $$
  select net.http_post(
    url := 'https://kgnjiyuzzlcxqnodikjk.supabase.co/functions/v1/auto-checkout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbmppeXV6emxjeHFub2Rpa2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDk5MjYsImV4cCI6MjA4Njk4NTkyNn0.uDhBBTTQlmXEb3z5nOqu-2nXc-YVKMxkz3SVgFcYRq8'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
