begin;

alter table public.game_rooms
  add column join_locked boolean not null default false,
  add column max_players integer not null default 100 check (max_players between 1 and 500),
  add column reveal_when_all_answered boolean not null default false,
  add column scoring_mode text not null default 'speed' check (scoring_mode in ('speed', 'fixed')),
  add column fixed_points integer not null default 100 check (fixed_points between 0 and 1000);

create or replace function public.quiz_host_configure_room(p_code text, p_settings jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms; v_limit integer; v_points integer; v_mode text;
begin
  select * into v_room from public.game_rooms where code = upper(p_code) for update;
  if not found or auth.uid() is null or v_room.host_id is distinct from auth.uid() then raise exception 'Somente o organizador pode configurar esta sala.'; end if;
  if v_room.status <> 'lobby' then raise exception 'As regras só podem ser alteradas antes da partida.'; end if;
  v_limit := coalesce((p_settings->>'max_players')::integer,v_room.max_players);
  v_points := coalesce((p_settings->>'fixed_points')::integer,v_room.fixed_points);
  v_mode := coalesce(p_settings->>'scoring_mode',v_room.scoring_mode);
  if v_limit not between 1 and 500 or v_points not between 0 and 1000 or v_mode not in ('speed','fixed') then raise exception 'Configuração de sala inválida.'; end if;
  update public.game_rooms set join_locked=coalesce((p_settings->>'join_locked')::boolean,join_locked),
    max_players=v_limit,reveal_when_all_answered=coalesce((p_settings->>'reveal_when_all_answered')::boolean,reveal_when_all_answered),
    scoring_mode=v_mode,fixed_points=v_points,updated_at=clock_timestamp() where id=v_room.id returning * into v_room;
  return public.quiz_host_state(p_code);
end $$;

create or replace function public.quiz_join_room(p_code text, p_nickname text, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms; v_player uuid; v_hash text;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Sessão inválida.'; end if;
  if p_nickname is null or length(trim(p_nickname)) not between 1 and 30 then raise exception 'Use um apelido de 1 a 30 caracteres.'; end if;
  select * into v_room from public.game_rooms where code = upper(p_code) for update;
  if not found then raise exception 'Sala não encontrada.'; end if;
  v_hash := encode(sha256(convert_to(p_token,'UTF8')), 'hex');
  select player_id into v_player from quiz_private.player_sessions where room_code=v_room.code and token_hash=v_hash;
  if v_player is not null then return public.quiz_player_state(p_code,p_token); end if;
  if v_room.status <> 'lobby' then raise exception 'A partida já começou ou foi encerrada.'; end if;
  if v_room.join_locked then raise exception 'O organizador bloqueou novas entradas.'; end if;
  if (select count(*) from public.room_players where room_code=v_room.code) >= v_room.max_players then raise exception 'A sala atingiu o limite de participantes.'; end if;
  if exists(select 1 from public.room_players where room_code=v_room.code and lower(nickname)=lower(trim(p_nickname))) then raise exception 'Este apelido já está em uso. Escolha outro ou retorne pelo dispositivo original.'; end if;
  insert into public.room_players(room_code,nickname) values(v_room.code,trim(p_nickname)) returning id into v_player;
  insert into quiz_private.player_sessions values(v_player,v_room.code,v_hash);
  return public.quiz_player_state(p_code,p_token);
end $$;

create or replace function public.quiz_submit_answer(p_code text, p_token text, p_round integer, p_answer integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms; v_player uuid; v_round quiz_private.rounds; v_correct boolean; v_points integer; v_now timestamptz; v_answers integer; v_players integer;
begin
  v_player := quiz_private.player_for_token(p_code,p_token);
  select * into strict v_room from public.game_rooms where code=upper(p_code) for update;
  if p_round is distinct from v_room.current_round then raise exception 'Esta rodada já foi encerrada.'; end if;
  if exists(select 1 from public.player_answers where room_code=v_room.code and player_id=v_player and round_index=p_round) then return public.quiz_player_state(p_code,p_token); end if;
  select * into v_round from quiz_private.rounds where room_id=v_room.id and round_index=p_round;
  v_now := clock_timestamp();
  if v_room.status <> 'playing' or v_room.round_state <> 'question' or v_round.deadline is null or v_now >= v_round.deadline then raise exception 'O tempo de resposta está encerrado ou pausado.'; end if;
  if p_answer is null or p_answer not between 0 and 3 then raise exception 'Alternativa inválida.'; end if;
  v_correct := (v_round.question->'alternatives'->p_answer->>'isCorrect')::boolean;
  v_points := case when not v_correct then 0 when v_room.scoring_mode='fixed' then v_room.fixed_points else 100 + floor(50 * least(1.0,greatest(0.0,extract(epoch from (v_round.deadline-v_now))*1000/v_round.duration_ms)))::integer end;
  insert into public.player_answers(room_code,player_id,player_nickname,round_index,answer_index,is_correct,points_earned,answered_at)
    select v_room.code,id,nickname,p_round,p_answer,v_correct,v_points,v_now from public.room_players where id=v_player;
  select count(*) into v_answers from public.player_answers where room_code=v_room.code and round_index=p_round and player_id is not null;
  select count(*) into v_players from public.room_players where room_code=v_room.code;
  update public.game_rooms set answered_count=v_answers,updated_at=v_now where id=v_room.id;
  if v_room.reveal_when_all_answered and v_answers >= v_players and v_players > 0 then
    update public.room_players p set score=p.score+a.points_earned from public.player_answers a where a.room_code=v_room.code and a.round_index=p_round and a.player_id=p.id;
    update quiz_private.rounds set finalized=true where room_id=v_room.id and round_index=p_round;
    update public.game_rooms set round_state='answered',current_question=v_round.question,question_deadline=null,paused_remaining_ms=null,updated_at=v_now where id=v_room.id;
  end if;
  return public.quiz_player_state(p_code,p_token);
end $$;

revoke all on function public.quiz_host_configure_room(text,jsonb) from public,anon,authenticated;
grant execute on function public.quiz_host_configure_room(text,jsonb) to authenticated;

commit;
