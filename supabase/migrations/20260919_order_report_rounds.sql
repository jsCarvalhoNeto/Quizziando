begin;

create or replace function public.quiz_host_state(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms;
begin
  select * into v_room from public.game_rooms where code=upper(p_code) for share;
  if not found or auth.uid() is null or v_room.host_id is distinct from auth.uid()
    then raise exception 'Acesso restrito ao organizador.'; end if;
  return jsonb_build_object('room',to_jsonb(v_room),
    'host_question',(select question from quiz_private.rounds where room_id=v_room.id and round_index=v_room.current_round),
    'used_question_ids',coalesce((select jsonb_agg(question_id order by round_index) from quiz_private.rounds where room_id=v_room.id),'[]'::jsonb),
    'players',coalesce((select jsonb_agg(to_jsonb(p) order by score desc,joined_at,id) from public.room_players p where room_code=v_room.code),'[]'::jsonb),
    'team_scores',coalesce((select jsonb_object_agg(team_name,score) from (select team_name,sum(score)::integer as score from public.room_players where room_code=v_room.code and team_name is not null group by team_name) t),'{}'::jsonb),
    'answers',coalesce((select jsonb_agg(to_jsonb(a)) from public.player_answers a where room_code=v_room.code and player_id is not null),'[]'::jsonb),
    'server_now',clock_timestamp());
end $$;

commit;
