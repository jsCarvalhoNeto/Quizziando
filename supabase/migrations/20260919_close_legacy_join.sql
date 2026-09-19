begin;

-- New players must use quiz_join_room_v2 so duel limits and team selection
-- cannot be bypassed by calling the legacy RPC directly.
revoke execute on function public.quiz_join_room(text,text,text) from public, anon, authenticated;

create or replace function public.quiz_join_room_v2(p_code text, p_nickname text, p_token text, p_team_name text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms; v_player uuid;
begin
  select * into v_room from public.game_rooms where code=upper(p_code) for update;
  if not found then raise exception 'Sala não encontrada.'; end if;

  select player_id into v_player from quiz_private.player_sessions
    where room_code=v_room.code and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if v_player is not null then return public.quiz_player_state(p_code,p_token); end if;

  if v_room.game_mode='duel' and
    (select count(*) from public.room_players where room_code=v_room.code) >= 2
    then raise exception 'O duelo já tem dois participantes.'; end if;
  if v_room.game_mode='team' and (p_team_name is null or length(trim(p_team_name)) not between 1 and 30)
    then raise exception 'Escolha um nome de time para entrar.'; end if;

  perform public.quiz_join_room(p_code,p_nickname,p_token);
  select player_id into v_player from quiz_private.player_sessions
    where room_code=v_room.code and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if v_room.game_mode='team' then
    update public.room_players set team_name=trim(p_team_name) where id=v_player;
  end if;
  return public.quiz_player_state(p_code,p_token);
end $$;

commit;
