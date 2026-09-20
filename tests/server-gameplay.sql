-- Execute against a migrated Supabase database. All fixtures are rolled back.
begin;

do $$
declare
  v_host uuid;
  v_room uuid := gen_random_uuid();
  v_question uuid := gen_random_uuid();
  v_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_token_a text := repeat('a', 64);
  v_token_b text := repeat('b', 64);
  v_player_a uuid;
  v_player_b uuid;
  v_snapshot jsonb;
  v_count integer;
  v_category uuid;
  v_saved_question uuid;
  v_lobby uuid := gen_random_uuid();
  v_lobby_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
begin
  select c.created_by, c.id, q.id into v_host, v_category, v_saved_question
    from public.questions q join public.categories c on c.id = q.category_id limit 1;
  if v_host is null then raise exception 'Teste requer um organizador com uma pergunta.'; end if;
  perform set_config('request.jwt.claim.sub', v_host::text, true);

  insert into public.game_rooms(id, code, host_id, game_mode, status, round_state,
    rounds, current_round, time_limit, scoring_mode, fixed_points)
  values(v_room, v_code, v_host, 'open', 'playing', 'question', 1, 1, 15, 'fixed', 100);
  insert into public.room_players(room_code, nickname)
    values(v_code, 'Teste A') returning id into v_player_a;
  insert into public.room_players(room_code, nickname)
    values(v_code, 'Teste B') returning id into v_player_b;
  insert into quiz_private.player_sessions(player_id, room_code, token_hash) values
    (v_player_a, v_code, encode(sha256(convert_to(v_token_a, 'UTF8')), 'hex')),
    (v_player_b, v_code, encode(sha256(convert_to(v_token_b, 'UTF8')), 'hex'));
  insert into quiz_private.rounds(room_id, round_index, question_id, question,
    duration_ms, started_at, deadline)
  values(v_room, 1, v_question,
    jsonb_build_object('id', v_question, 'alternatives', jsonb_build_array(
      jsonb_build_object('text', 'Certa', 'isCorrect', true),
      jsonb_build_object('text', 'Errada', 'isCorrect', false),
      jsonb_build_object('text', 'Outra', 'isCorrect', false),
      jsonb_build_object('text', 'Mais uma', 'isCorrect', false))),
    15000, clock_timestamp(), clock_timestamp() + interval '15 seconds');

  -- A saved token reconnects during the match without creating a new player.
  v_snapshot := public.quiz_join_room_v2(v_code, 'Teste A', v_token_a, null);
  if v_snapshot->'player'->>'id' <> v_player_a::text then
    raise exception 'Reconexão criou ou selecionou outro participante.';
  end if;

  v_snapshot := public.quiz_submit_answer(v_code, v_token_a, 1, 0);
  if (v_snapshot->'answer'->>'answer_index')::integer <> 0 then
    raise exception 'A primeira resposta não foi recuperada.';
  end if;
  v_snapshot := public.quiz_submit_answer(v_code, v_token_a, 1, 1);
  select count(*) into v_count from public.player_answers
    where room_code = v_code and player_id = v_player_a and round_index = 1;
  if v_count <> 1 or (v_snapshot->'answer'->>'answer_index')::integer <> 0 or
    (select answered_count from public.game_rooms where id = v_room) <> 1 then
    raise exception 'Resposta duplicada alterou a resposta ou o contador.';
  end if;

  update quiz_private.rounds set deadline = clock_timestamp() - interval '1 second'
    where room_id = v_room and round_index = 1;
  begin
    perform public.quiz_submit_answer(v_code, v_token_b, 1, 0);
    raise exception 'Resposta após o prazo foi aceita.';
  exception when others then
    if sqlerrm <> 'O tempo de resposta está encerrado ou pausado.' then raise; end if;
  end;
  select count(*) into v_count from public.player_answers
    where room_code = v_code and player_id = v_player_b;
  if v_count <> 0 then raise exception 'Resposta fora do prazo foi gravada.'; end if;

  v_snapshot := public.quiz_host_state(v_code);
  if (v_snapshot->'used_question_ids'->>0) <> v_question::text or
    jsonb_array_length(v_snapshot->'answers') <> 1 or
    (v_snapshot->'players'->0->>'id') is null then
    raise exception 'Recuperação do organizador perdeu a rodada ou respostas.';
  end if;

  -- The lobby preserves the exact question selection for a later host login.
  insert into public.game_rooms(id, code, host_id, game_mode, status, round_state,
    rounds, current_round, time_limit, categories)
  values(v_lobby, v_lobby_code, v_host, 'open', 'lobby', 'idle', 1, 1, 15,
    jsonb_build_array(jsonb_build_object('id', v_category)));
  v_snapshot := public.quiz_host_configure_room(v_lobby_code,
    jsonb_build_object('question_ids', jsonb_build_array(v_saved_question)));
  if (v_snapshot->'room'->'question_ids'->>0) <> v_saved_question::text then
    raise exception 'Seleção de perguntas não foi salva na sala.';
  end if;
  v_snapshot := public.quiz_host_state(v_lobby_code);
  if (v_snapshot->'room'->'question_ids'->>0) <> v_saved_question::text then
    raise exception 'Seleção de perguntas não foi recuperada para o organizador.';
  end if;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  begin
    perform public.quiz_host_state(v_lobby_code);
    raise exception 'Outro usuário conseguiu recuperar o painel do organizador.';
  exception when others then
    if sqlerrm <> 'Acesso restrito ao organizador.' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', v_host::text, true);
  begin
    perform public.quiz_host_configure_room(v_lobby_code,
      jsonb_build_object('question_ids', jsonb_build_array(gen_random_uuid())));
    raise exception 'Pergunta de outra seleção foi aceita.';
  exception when others then
    if sqlerrm <> 'A seleção de perguntas não pertence às categorias desta sala.' then raise; end if;
  end;
end $$;

rollback;
