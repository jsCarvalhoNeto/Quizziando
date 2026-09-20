begin;

alter table public.game_rooms
  add column if not exists question_ids uuid[] not null default '{}';

create or replace function public.quiz_host_configure_room(p_code text, p_settings jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_room public.game_rooms;
  v_limit integer;
  v_points integer;
  v_mode text;
  v_question_ids uuid[];
begin
  select * into v_room from public.game_rooms where code = upper(p_code) for update;
  if not found or auth.uid() is null or v_room.host_id is distinct from auth.uid() then
    raise exception 'Somente o organizador pode configurar esta sala.';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'As regras só podem ser alteradas antes da partida.';
  end if;

  v_limit := coalesce((p_settings->>'max_players')::integer, v_room.max_players);
  v_points := coalesce((p_settings->>'fixed_points')::integer, v_room.fixed_points);
  v_mode := coalesce(p_settings->>'scoring_mode', v_room.scoring_mode);
  if v_limit not between 1 and 500 or v_points not between 0 and 1000 or
    v_mode not in ('speed', 'fixed') then
    raise exception 'Configuração de sala inválida.';
  end if;

  if p_settings ? 'question_ids' then
    if jsonb_typeof(p_settings->'question_ids') <> 'array' or
      jsonb_array_length(p_settings->'question_ids') > 1000 then
      raise exception 'Seleção de perguntas inválida.';
    end if;
    select coalesce(array_agg(id::uuid), '{}'::uuid[]) into v_question_ids
      from jsonb_array_elements_text(p_settings->'question_ids') as selected(id);
    if cardinality(v_question_ids) < v_room.rounds or
      (select count(distinct q.id) from public.questions q
        join public.categories c on c.id = q.category_id
        where q.id = any(v_question_ids) and c.created_by = auth.uid()
          and exists(select 1 from jsonb_array_elements(v_room.categories) cat
            where cat->>'id' = c.id::text)) <> cardinality(v_question_ids) then
      raise exception 'A seleção de perguntas não pertence às categorias desta sala.';
    end if;
  else
    v_question_ids := v_room.question_ids;
  end if;

  update public.game_rooms set
    join_locked = coalesce((p_settings->>'join_locked')::boolean, join_locked),
    max_players = v_limit,
    reveal_when_all_answered = coalesce((p_settings->>'reveal_when_all_answered')::boolean, reveal_when_all_answered),
    scoring_mode = v_mode,
    fixed_points = v_points,
    question_ids = v_question_ids,
    updated_at = clock_timestamp()
  where id = v_room.id;
  return public.quiz_host_state(p_code);
end $$;

revoke all on function public.quiz_host_configure_room(text, jsonb) from public, anon, authenticated;
grant execute on function public.quiz_host_configure_room(text, jsonb) to authenticated;

commit;
