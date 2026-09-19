begin;

create or replace function public.quiz_join_room_v2(p_code text, p_nickname text, p_token text, p_team_name text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms; v_player uuid; v_snapshot jsonb;
begin
  select * into v_room from public.game_rooms where code=upper(p_code) for update;
  if not found then raise exception 'Sala não encontrada.'; end if;
  if v_room.game_mode='duel' and not exists(select 1 from quiz_private.player_sessions where room_code=v_room.code and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex'))
    and (select count(*) from public.room_players where room_code=v_room.code) >= 2 then raise exception 'O duelo já tem dois participantes.'; end if;
  if v_room.game_mode='team' and (p_team_name is null or length(trim(p_team_name)) not between 1 and 30) then raise exception 'Escolha um nome de time para entrar.'; end if;
  v_snapshot := public.quiz_join_room(p_code,p_nickname,p_token);
  select player_id into v_player from quiz_private.player_sessions where room_code=v_room.code and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if v_room.game_mode='team' then
    if v_room.status <> 'lobby' then raise exception 'A partida já começou.'; end if;
    update public.room_players set team_name=trim(p_team_name) where id=v_player;
  end if;
  return public.quiz_player_state(p_code,p_token);
end $$;

create or replace function public.quiz_host_state(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms;
begin
  select * into v_room from public.game_rooms where code=upper(p_code) for share;
  if not found or auth.uid() is null or v_room.host_id is distinct from auth.uid() then raise exception 'Acesso restrito ao organizador.'; end if;
  return jsonb_build_object('room',to_jsonb(v_room),
    'host_question',(select question from quiz_private.rounds where room_id=v_room.id and round_index=v_room.current_round),
    'used_question_ids',coalesce((select jsonb_agg(question_id) from quiz_private.rounds where room_id=v_room.id),'[]'::jsonb),
    'players',coalesce((select jsonb_agg(to_jsonb(p) order by score desc,joined_at,id) from public.room_players p where room_code=v_room.code),'[]'::jsonb),
    'team_scores',coalesce((select jsonb_object_agg(team_name,score) from (select team_name,sum(score)::integer as score from public.room_players where room_code=v_room.code and team_name is not null group by team_name) t),'{}'::jsonb),
    'answers',coalesce((select jsonb_agg(to_jsonb(a)) from public.player_answers a where room_code=v_room.code and player_id is not null),'[]'::jsonb),
    'server_now',clock_timestamp());
end $$;

revoke all on function public.quiz_join_room_v2(text,text,text,text) from public,anon,authenticated;
grant execute on function public.quiz_join_room_v2(text,text,text,text) to anon,authenticated;

commit;
