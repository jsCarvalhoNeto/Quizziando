-- Apply once, with no games in progress, before deploying the matching frontend.
-- Legacy rooms cannot prove ownership or player identity and are closed below.
begin;

create extension if not exists pgcrypto;
create schema if not exists quiz_private;
revoke all on schema quiz_private from public, anon, authenticated;

alter table public.game_rooms
  add column host_id uuid references auth.users(id),
  add column categories jsonb not null default '[]',
  add column question_deadline timestamptz,
  add column paused_remaining_ms integer,
  add column answered_count integer not null default 0;

update public.game_rooms set status = 'finished', current_question = null;

create table quiz_private.player_sessions (
  player_id uuid primary key references public.room_players(id) on delete cascade,
  room_code text not null,
  token_hash text not null,
  unique(room_code, token_hash)
);

create table quiz_private.rounds (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  round_index integer not null,
  question_id uuid not null,
  question jsonb not null,
  duration_ms integer not null,
  started_at timestamptz,
  deadline timestamptz,
  paused_remaining_ms integer,
  finalized boolean not null default false,
  primary key(room_id, round_index),
  unique(room_id, question_id)
);

alter table quiz_private.player_sessions enable row level security;
alter table quiz_private.rounds enable row level security;
revoke all on all tables in schema quiz_private from public, anon, authenticated;

-- Keep old answer history intact. New answers have a stable player identity.
alter table public.player_answers add column player_id uuid references public.room_players(id) on delete cascade;
create unique index player_answers_once on public.player_answers(room_code, player_id, round_index)
  where player_id is not null;

-- Remove demo policies and public access to the question bank (including gabaritos).
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in
      ('game_rooms','room_players','player_answers','category_folders','categories','questions','alternatives')
  loop execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;

create policy rooms_read on public.game_rooms for select using (true);
create policy players_read on public.room_players for select using (true);
create policy host_remove_player on public.room_players for delete to authenticated using (
  exists(select 1 from public.game_rooms r where r.code = room_code and r.host_id = auth.uid() and r.status = 'lobby')
);
create policy host_read_answers on public.player_answers for select to authenticated using (
  exists(select 1 from public.game_rooms r where r.code = room_code and r.host_id = auth.uid())
);
create policy own_folders on public.category_folders for all to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy own_categories on public.categories for all to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid() and
    (folder_id is null or exists(select 1 from public.category_folders f where f.id = folder_id and f.created_by = auth.uid())));
create policy own_questions on public.questions for all to authenticated
  using (exists(select 1 from public.categories c where c.id = category_id and c.created_by = auth.uid()))
  with check (exists(select 1 from public.categories c where c.id = category_id and c.created_by = auth.uid()));
create policy own_alternatives on public.alternatives for all to authenticated
  using (exists(select 1 from public.questions q join public.categories c on c.id = q.category_id
    where q.id = question_id and c.created_by = auth.uid()))
  with check (exists(select 1 from public.questions q join public.categories c on c.id = q.category_id
    where q.id = question_id and c.created_by = auth.uid()));

revoke insert, update, delete on public.game_rooms from anon, authenticated;
revoke insert, update on public.room_players from anon, authenticated;
revoke all on public.player_answers from anon, authenticated;
grant select on public.player_answers to authenticated;
grant select on public.game_rooms, public.room_players to anon, authenticated;
grant delete on public.room_players to authenticated;

create function quiz_private.player_for_token(p_code text, p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Sessão de participante inválida.'; end if;
  select player_id into v_id from quiz_private.player_sessions
    where room_code = upper(p_code) and token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if v_id is null then raise exception 'Sessão não encontrada. Entre novamente na sala.'; end if;
  return v_id;
end $$;

create function public.quiz_create_room(p_request_id uuid, p_mode text, p_rounds integer, p_time_limit integer, p_category_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms; v_cats jsonb; v_count integer; v_code text;
begin
  if auth.uid() is null then raise exception 'Entre como organizador para criar uma sala.'; end if;
  select * into v_room from public.game_rooms where id = p_request_id and host_id = auth.uid();
  if found then return to_jsonb(v_room); end if;
  if p_mode is null or p_mode not in ('open','team','duel') or p_rounds is null or p_rounds not between 1 and 100
    or p_time_limit is null or p_time_limit not between 5 and 600 then raise exception 'Configuração de partida inválida.'; end if;
  select jsonb_agg(jsonb_build_object('id',id,'name',name,'color',color,'icon',icon) order by name), count(*)
    into v_cats, v_count from public.categories where id = any(p_category_ids) and created_by = auth.uid();
  if v_count = 0 or v_count <> cardinality(p_category_ids) then raise exception 'Selecione categorias do seu acervo.'; end if;
  if (select count(*) from public.questions where category_id = any(p_category_ids)) < p_rounds
    then raise exception 'Não há perguntas suficientes para jogar sem repetição. Reduza as rodadas.'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    begin
      insert into public.game_rooms(id,code,host_id,game_mode,rounds,time_limit,categories)
        values(p_request_id,v_code,auth.uid(),p_mode,p_rounds,p_time_limit,v_cats) returning * into v_room;
      exit;
    exception when unique_violation then
      select * into v_room from public.game_rooms where id = p_request_id and host_id = auth.uid();
      if found then return to_jsonb(v_room); end if;
      if exists(select 1 from public.game_rooms where id = p_request_id) then raise exception 'Identificador de sala indisponível.'; end if;
    end;
  end loop;
  return to_jsonb(v_room);
end $$;

create function public.quiz_player_state(p_code text, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_player uuid; v_room public.game_rooms; v_answer jsonb; v_revealed boolean;
begin
  v_player := quiz_private.player_for_token(p_code,p_token);
  select * into strict v_room from public.game_rooms where code = upper(p_code) for share;
  v_revealed := v_room.round_state in ('answered','ranking') or v_room.status = 'finished';
  select jsonb_build_object('answer_index',answer_index,
    'is_correct',case when v_revealed then is_correct else null end,
    'points_earned',case when v_revealed then points_earned else null end)
    into v_answer from public.player_answers where player_id = v_player and room_code = v_room.code and round_index = v_room.current_round;
  return jsonb_build_object('room',to_jsonb(v_room),
    'player',(select to_jsonb(p) from public.room_players p where id = v_player),
    'answer',v_answer,
    'players',coalesce((select jsonb_agg(to_jsonb(p) order by score desc, joined_at, id) from public.room_players p where room_code = v_room.code),'[]'::jsonb),
    'server_now',clock_timestamp());
end $$;

create function public.quiz_join_room(p_code text, p_nickname text, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms; v_player uuid; v_hash text;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Sessão inválida.'; end if;
  if p_nickname is null or length(trim(p_nickname)) not between 1 and 30 then raise exception 'Use um apelido de 1 a 30 caracteres.'; end if;
  select * into v_room from public.game_rooms where code = upper(p_code) for update;
  if not found then raise exception 'Sala não encontrada.'; end if;
  v_hash := encode(sha256(convert_to(p_token,'UTF8')), 'hex');
  select player_id into v_player from quiz_private.player_sessions where room_code = v_room.code and token_hash = v_hash;
  if v_player is not null then return public.quiz_player_state(p_code,p_token); end if;
  if v_room.status <> 'lobby' then raise exception 'A partida já começou ou foi encerrada.'; end if;
  if exists(select 1 from public.room_players where room_code = v_room.code and lower(nickname) = lower(trim(p_nickname)))
    then raise exception 'Este apelido já está em uso. Escolha outro ou retorne pelo dispositivo original.'; end if;
  insert into public.room_players(room_code,nickname) values(v_room.code,trim(p_nickname)) returning id into v_player;
  insert into quiz_private.player_sessions values(v_player,v_room.code,v_hash);
  return public.quiz_player_state(p_code,p_token);
end $$;

create function public.quiz_submit_answer(p_code text, p_token text, p_round integer, p_answer integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms; v_player uuid; v_round quiz_private.rounds; v_correct boolean; v_points integer; v_now timestamptz;
begin
  v_player := quiz_private.player_for_token(p_code,p_token);
  select * into strict v_room from public.game_rooms where code = upper(p_code) for update;
  if p_round is distinct from v_room.current_round then raise exception 'Esta rodada já foi encerrada.'; end if;
  -- Retrying an acknowledged or uncertain request never inserts or scores again.
  if exists(select 1 from public.player_answers where room_code = v_room.code and player_id = v_player and round_index = p_round)
    then return public.quiz_player_state(p_code,p_token); end if;
  select * into v_round from quiz_private.rounds where room_id = v_room.id and round_index = p_round;
  v_now := clock_timestamp();
  if v_room.status <> 'playing' or v_room.round_state <> 'question' or v_round.deadline is null
    or v_round.paused_remaining_ms is not null or v_now >= v_round.deadline then raise exception 'O tempo de resposta está encerrado ou pausado.'; end if;
  if p_answer is null or p_answer not between 0 and 3 then raise exception 'Alternativa inválida.'; end if;
  v_correct := (v_round.question->'alternatives'->p_answer->>'isCorrect')::boolean;
  v_points := case when v_correct then 100 + floor(50 * least(1.0, greatest(0.0,
    extract(epoch from (v_round.deadline-v_now))*1000 / v_round.duration_ms)))::integer else 0 end;
  insert into public.player_answers(room_code,player_id,player_nickname,round_index,answer_index,is_correct,points_earned,answered_at)
    select v_room.code,id,nickname,p_round,p_answer,v_correct,v_points,v_now from public.room_players where id = v_player;
  update public.game_rooms set answered_count = answered_count + 1, updated_at = v_now where id = v_room.id;
  return public.quiz_player_state(p_code,p_token);
end $$;

create function public.quiz_host_state(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms;
begin
  select * into v_room from public.game_rooms where code = upper(p_code) for share;
  if not found or auth.uid() is null or v_room.host_id is distinct from auth.uid() then raise exception 'Acesso restrito ao organizador.'; end if;
  return jsonb_build_object('room',to_jsonb(v_room),
    'host_question',(select question from quiz_private.rounds where room_id=v_room.id and round_index=v_room.current_round),
    'used_question_ids',coalesce((select jsonb_agg(question_id) from quiz_private.rounds where room_id=v_room.id),'[]'::jsonb),
    'players',coalesce((select jsonb_agg(to_jsonb(p) order by joined_at,id) from public.room_players p where room_code=v_room.code),'[]'::jsonb),
    'answers',coalesce((select jsonb_agg(to_jsonb(a)) from public.player_answers a where room_code=v_room.code and player_id is not null),'[]'::jsonb),
    'server_now',clock_timestamp());
end $$;

create function public.quiz_host_update(p_code text, p_expected_round integer, p_update jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.game_rooms; v_round quiz_private.rounds; v_phase text; v_next integer;
  v_question jsonb; v_category jsonb; v_alts jsonb; v_correct integer; v_ms integer; v_now timestamptz;
begin
  select * into v_room from public.game_rooms where code = upper(p_code) for update;
  if not found or auth.uid() is null or v_room.host_id is distinct from auth.uid() then raise exception 'Somente o organizador pode controlar esta sala.'; end if;
  if p_expected_round is distinct from v_room.current_round then raise exception 'O estado da rodada mudou. Atualize a sala.'; end if;
  if v_room.status = 'finished' then raise exception 'Esta sala foi encerrada.'; end if;
  v_now := clock_timestamp();
  v_phase := coalesce(p_update->>'round_state',v_room.round_state);
  v_next := coalesce((p_update->>'current_round')::integer,v_room.current_round);

  if p_update->>'status' = 'playing' and v_room.status = 'lobby' then
    if not exists(select 1 from public.room_players where room_code = v_room.code) then raise exception 'Aguarde pelo menos um participante.'; end if;
    v_room.status := 'playing';
  elsif v_room.status <> 'playing' then raise exception 'A partida ainda não começou.';
  end if;

  if v_next <> v_room.current_round then
    if v_next <> v_room.current_round + 1 or v_next > v_room.rounds or v_room.round_state not in ('answered','ranking') or v_phase <> 'idle'
      then raise exception 'Avanço de rodada inválido.'; end if;
    v_room.current_round := v_next;
    v_room.current_question := null; v_room.selected_category := null;
    v_room.question_deadline := null; v_room.paused_remaining_ms := null; v_room.answered_count := 0;
  elsif v_phase <> v_room.round_state and not (
    (v_room.round_state = 'idle' and v_phase = 'spinning') or
    (v_room.round_state = 'spinning' and v_phase = 'category-reveal') or
    (v_room.round_state = 'category-reveal' and v_phase = 'question-reveal') or
    (v_room.round_state = 'question-reveal' and v_phase = 'question') or
    (v_room.round_state = 'question' and v_phase = 'answered') or
    (v_room.round_state = 'answered' and v_phase = 'ranking') or
    (p_update->>'status' = 'finished' and v_room.round_state in ('answered','ranking'))
  ) then raise exception 'Transição de rodada inválida.'; end if;

  select * into v_round from quiz_private.rounds where room_id = v_room.id and round_index = v_room.current_round;
  if v_phase = 'category-reveal' and v_round.room_id is null then
    select jsonb_build_object('id',q.id,'category_id',q.category_id,'question_text',q.question_text,'time_limit',q.time_limit),
      jsonb_build_object('id',c.id,'name',c.name,'color',c.color,'icon',c.icon)
      into v_question,v_category from public.questions q join public.categories c on c.id = q.category_id
      where q.id = (p_update->'current_question'->>'id')::uuid and c.created_by = auth.uid()
        and exists(select 1 from jsonb_array_elements(v_room.categories) cat where cat->>'id' = c.id::text);
    if v_question is null then raise exception 'Pergunta indisponível no acervo selecionado.'; end if;
    select jsonb_agg(jsonb_build_object('text',alternative_text,'isCorrect',is_correct) order by id), count(*) filter(where is_correct)
      into v_alts,v_correct from public.alternatives where question_id = (v_question->>'id')::uuid;
    if jsonb_array_length(v_alts) is distinct from 4 or v_correct <> 1 then raise exception 'A pergunta precisa de quatro alternativas e um único gabarito.'; end if;
    v_question := v_question || jsonb_build_object('alternatives',v_alts);
    v_ms := (v_question->>'time_limit')::integer * 1000;
    if v_ms not between 5000 and 600000 then raise exception 'Tempo da pergunta deve ficar entre 5 e 600 segundos.'; end if;
    insert into quiz_private.rounds(room_id,round_index,question_id,question,duration_ms)
      values(v_room.id,v_room.current_round,(v_question->>'id')::uuid,v_question,v_ms) returning * into v_round;
    v_room.current_question := v_question || jsonb_build_object('alternatives',
      (select jsonb_agg(a - 'isCorrect' order by n) from jsonb_array_elements(v_alts) with ordinality as x(a,n)));
    v_room.selected_category := v_category;
    v_room.time_limit := v_ms / 1000;
  end if;

  if v_phase = 'question' then
    if v_round.room_id is null then raise exception 'Selecione uma pergunta primeiro.'; end if;
    if v_round.started_at is null then
      v_round.started_at := v_now; v_round.deadline := v_now + v_round.duration_ms * interval '1 millisecond';
    end if;
    if p_update ? 'paused' then
      if (p_update->>'paused')::boolean and v_round.paused_remaining_ms is null then
        if v_round.deadline <= v_now then raise exception 'O tempo já terminou.'; end if;
        v_round.paused_remaining_ms := ceil(extract(epoch from (v_round.deadline-v_now))*1000)::integer;
        v_round.deadline := null;
      elsif not (p_update->>'paused')::boolean and v_round.paused_remaining_ms is not null then
        v_round.deadline := v_now + v_round.paused_remaining_ms * interval '1 millisecond';
        v_round.paused_remaining_ms := null;
      end if;
    end if;
    if p_update ? 'adjust_seconds' then
      v_ms := (p_update->>'adjust_seconds')::integer * 1000;
      if v_ms is null or v_ms not in (-5000,5000) then raise exception 'Ajuste de tempo inválido.'; end if;
      if v_round.paused_remaining_ms is not null then
        v_round.paused_remaining_ms := greatest(1000,least(600000,v_round.paused_remaining_ms+v_ms));
      else
        if v_round.deadline <= v_now then raise exception 'O tempo já terminou.'; end if;
        v_round.deadline := greatest(v_now+interval '1 second',least(v_now+interval '600 seconds',v_round.deadline+v_ms*interval '1 millisecond'));
      end if;
    end if;
    update quiz_private.rounds set started_at=v_round.started_at,deadline=v_round.deadline,paused_remaining_ms=v_round.paused_remaining_ms
      where room_id=v_room.id and round_index=v_room.current_round;
    v_room.question_deadline := v_round.deadline; v_room.paused_remaining_ms := v_round.paused_remaining_ms;
  end if;

  if v_phase = 'answered' and not v_round.finalized then
    -- Serialize with answer submissions using the room lock, and score only once.
    update public.room_players p set score = p.score + a.points_earned from public.player_answers a
      where a.room_code=v_room.code and a.round_index=v_room.current_round and a.player_id=p.id;
    update quiz_private.rounds set finalized=true where room_id=v_room.id and round_index=v_room.current_round;
    v_room.current_question := v_round.question;
    v_room.question_deadline := null; v_room.paused_remaining_ms := null;
  end if;
  if p_update->>'status' = 'finished' then
    if v_room.current_round <> v_room.rounds or v_room.round_state not in ('answered','ranking')
      then raise exception 'Conclua as rodadas antes de encerrar.'; end if;
    v_room.status := 'finished';
  end if;
  update public.game_rooms set status=v_room.status,round_state=v_phase,current_round=v_room.current_round,
    current_question=v_room.current_question,selected_category=v_room.selected_category,time_limit=v_room.time_limit,
    question_deadline=v_room.question_deadline,paused_remaining_ms=v_room.paused_remaining_ms,
    answered_count=v_room.answered_count,updated_at=v_now where id=v_room.id returning * into v_room;
  return public.quiz_host_state(p_code);
end $$;

revoke all on function quiz_private.player_for_token(text,text) from public, anon, authenticated;
revoke all on function public.quiz_create_room(uuid,text,integer,integer,uuid[]) from public, anon, authenticated;
revoke all on function public.quiz_host_update(text,integer,jsonb) from public, anon, authenticated;
revoke all on function public.quiz_host_state(text) from public, anon, authenticated;
revoke all on function public.quiz_join_room(text,text,text) from public, anon, authenticated;
revoke all on function public.quiz_player_state(text,text) from public, anon, authenticated;
revoke all on function public.quiz_submit_answer(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.quiz_create_room(uuid,text,integer,integer,uuid[]) to authenticated;
grant execute on function public.quiz_host_update(text,integer,jsonb) to authenticated;
grant execute on function public.quiz_host_state(text) to authenticated;
grant execute on function public.quiz_join_room(text,text,text), public.quiz_player_state(text,text), public.quiz_submit_answer(text,text,integer,integer) to anon, authenticated;

commit;
