begin;

create or replace function public.quiz_save_question(
  p_question_id uuid,
  p_category_id uuid,
  p_question_text text,
  p_time_limit integer,
  p_explanation text,
  p_reference_url text,
  p_difficulty text,
  p_tags text[],
  p_alternatives jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_question_id uuid;
  v_alternative jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'operator'
  ) then
    raise exception 'Somente organizadores podem salvar perguntas.';
  end if;

  if not exists (
    select 1 from public.categories where id = p_category_id and created_by = auth.uid()
  ) then
    raise exception 'Categoria não encontrada para este organizador.';
  end if;

  if p_question_id is not null and not exists (
    select 1 from public.questions q join public.categories c on c.id = q.category_id
    where q.id = p_question_id and c.created_by = auth.uid()
  ) then
    raise exception 'Pergunta não encontrada para este organizador.';
  end if;

  if length(trim(coalesce(p_question_text, ''))) not between 1 and 1000
    or p_time_limit not between 5 and 600
    or p_difficulty not in ('easy', 'medium', 'hard')
    or p_alternatives is null
    or jsonb_typeof(p_alternatives) <> 'array'
    or jsonb_array_length(p_alternatives) <> 4
    or (select count(*) from jsonb_array_elements(p_alternatives) a
        where a->>'isCorrect' = 'true') <> 1
    or exists (select 1 from jsonb_array_elements(p_alternatives) a
        where jsonb_typeof(a->'text') <> 'string'
          or length(trim(a->>'text')) not between 1 and 500
          or jsonb_typeof(a->'isCorrect') <> 'boolean')
  then
    raise exception 'Dados da pergunta ou alternativas inválidos.';
  end if;

  if p_reference_url is not null and p_reference_url !~* '^https?://[^[:space:]]+$' then
    raise exception 'URL de referência inválida.';
  end if;

  if p_question_id is null then
    insert into public.questions(category_id, question_text, time_limit, explanation,
      reference_url, difficulty, tags)
    values (p_category_id, trim(p_question_text), p_time_limit,
      nullif(trim(p_explanation), ''), nullif(trim(p_reference_url), ''),
      p_difficulty, coalesce(p_tags, '{}'::text[]))
    returning id into v_question_id;
  else
    update public.questions set category_id = p_category_id,
      question_text = trim(p_question_text), time_limit = p_time_limit,
      explanation = nullif(trim(p_explanation), ''),
      reference_url = nullif(trim(p_reference_url), ''),
      difficulty = p_difficulty, tags = coalesce(p_tags, '{}'::text[])
    where id = p_question_id;
    v_question_id := p_question_id;
    delete from public.alternatives where question_id = v_question_id;
  end if;

  for v_alternative in select value from jsonb_array_elements(p_alternatives) loop
    insert into public.alternatives(question_id, alternative_text, is_correct)
    values (v_question_id, trim(v_alternative->>'text'), (v_alternative->>'isCorrect')::boolean);
  end loop;

  return v_question_id;
end $$;

revoke all on function public.quiz_save_question(uuid, uuid, text, integer, text, text, text, text[], jsonb)
  from public, anon, authenticated;
grant execute on function public.quiz_save_question(uuid, uuid, text, integer, text, text, text, text[], jsonb)
  to authenticated;

commit;
