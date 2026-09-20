begin;

alter table public.questions
  add column if not exists difficulty text not null default 'medium',
  add column if not exists tags text[] not null default '{}';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'questions_difficulty_valid') then
    alter table public.questions add constraint questions_difficulty_valid
      check (difficulty in ('easy', 'medium', 'hard'));
  end if;
end $$;

commit;
