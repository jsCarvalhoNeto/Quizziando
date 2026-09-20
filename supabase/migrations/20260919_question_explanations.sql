begin;

alter table public.questions
  add column if not exists explanation text,
  add column if not exists reference_url text;

-- Keep the explanation in the protected round record until the answer is revealed.
create or replace function quiz_private.attach_question_explanation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_explanation text; v_reference text;
begin
  select q.explanation, q.reference_url into v_explanation, v_reference
    from public.questions q where q.id = new.question_id;
  new.question := new.question || jsonb_build_object('explanation', v_explanation, 'reference_url', v_reference);
  return new;
end $$;

drop trigger if exists attach_question_explanation on quiz_private.rounds;
create trigger attach_question_explanation before insert on quiz_private.rounds
  for each row execute function quiz_private.attach_question_explanation();

commit;
