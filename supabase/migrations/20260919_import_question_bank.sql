begin;

create or replace function public.quiz_import_question_bank(p_bank jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_category jsonb; v_question jsonb; v_alternative jsonb;
  v_map jsonb := '{}'::jsonb; v_category_id uuid; v_question_id uuid;
  v_categories integer := 0; v_questions integer := 0;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='operator')
    then raise exception 'Somente organizadores podem importar o acervo.'; end if;
  if p_bank->>'format' <> 'quizziando-question-bank' or (p_bank->>'version')::integer <> 1 or
    jsonb_typeof(p_bank->'categories') <> 'array' or jsonb_typeof(p_bank->'questions') <> 'array'
    then raise exception 'Formato de acervo inválido.'; end if;
  if jsonb_array_length(p_bank->'categories') > 100 or jsonb_array_length(p_bank->'questions') > 1000
    then raise exception 'O acervo excede o limite de importação.'; end if;

  for v_category in select value from jsonb_array_elements(p_bank->'categories') loop
    if length(trim(v_category->>'name')) not between 1 and 100 or v_category->>'id' is null
      then raise exception 'Categoria inválida no arquivo.'; end if;
    select id into v_category_id from public.categories
      where created_by=auth.uid() and lower(name)=lower(trim(v_category->>'name')) limit 1;
    if v_category_id is null then
      insert into public.categories(name,color,icon,created_by)
      values(trim(v_category->>'name'),coalesce(nullif(v_category->>'color',''),'#7C3AED'),
        coalesce(nullif(v_category->>'icon',''),'HelpCircle'),auth.uid()) returning id into v_category_id;
      v_categories := v_categories + 1;
    end if;
    v_map := v_map || jsonb_build_object(v_category->>'id', v_category_id::text);
    v_category_id := null;
  end loop;

  for v_question in select value from jsonb_array_elements(p_bank->'questions') loop
    if v_map->>(v_question->>'category_id') is null or
      length(trim(v_question->>'question_text')) not between 1 and 1000 or
      (v_question->>'time_limit')::integer not between 5 and 600 or
      jsonb_typeof(v_question->'alternatives') <> 'array' or
      jsonb_array_length(v_question->'alternatives') <> 4 or
      (select count(*) from jsonb_array_elements(v_question->'alternatives') a where (a->>'isCorrect')::boolean) <> 1
      then raise exception 'Pergunta inválida no arquivo.'; end if;
    insert into public.questions(category_id,question_text,time_limit,explanation,reference_url,difficulty,tags)
      values((v_map->>(v_question->>'category_id'))::uuid,trim(v_question->>'question_text'),
        (v_question->>'time_limit')::integer,nullif(v_question->>'explanation',''),nullif(v_question->>'reference_url',''),
        coalesce(nullif(v_question->>'difficulty',''),'medium'),
        coalesce((select array_agg(value #>> '{}') from jsonb_array_elements(v_question->'tags') value),'{}'::text[]))
      returning id into v_question_id;
    for v_alternative in select value from jsonb_array_elements(v_question->'alternatives') loop
      if length(trim(v_alternative->>'text')) not between 1 and 500 then raise exception 'Alternativa inválida no arquivo.'; end if;
      insert into public.alternatives(question_id,alternative_text,is_correct)
        values(v_question_id,trim(v_alternative->>'text'),(v_alternative->>'isCorrect')::boolean);
    end loop;
    v_questions := v_questions + 1;
  end loop;
  return jsonb_build_object('categories_created',v_categories,'questions_created',v_questions);
end $$;

revoke all on function public.quiz_import_question_bank(jsonb) from public, anon, authenticated;
grant execute on function public.quiz_import_question_bank(jsonb) to authenticated;

commit;
