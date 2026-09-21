-- Migração: Suporte ao Quiz Clássico (sem roleta obrigatória)
-- Permite que salas no formato clássico transitem diretamente de 'idle' para 'question-reveal' ou 'category-reveal'

create or replace function public.quiz_host_update(p_code text, p_expected_round integer, p_update jsonb) returns jsonb
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
    -- Permite transição para spinning (Modo Roleta) OU direto para category-reveal / question-reveal (Modo Clássico Kahoot)
    (v_room.round_state = 'idle' and v_phase in ('spinning', 'category-reveal', 'question-reveal')) or
    (v_room.round_state = 'spinning' and v_phase in ('category-reveal', 'question-reveal')) or
    (v_room.round_state = 'category-reveal' and v_phase = 'question-reveal') or
    (v_room.round_state = 'question-reveal' and v_phase = 'question') or
    (v_room.round_state = 'question' and v_phase = 'answered') or
    (v_room.round_state = 'answered' and v_phase = 'ranking') or
    (p_update->>'status' = 'finished' and v_room.round_state in ('answered','ranking'))
  ) then raise exception 'Transição de rodada inválida.'; end if;

  select * into v_round from quiz_private.rounds where room_id = v_room.id and round_index = v_room.current_round;
  if v_phase in ('category-reveal', 'question-reveal') and v_round.room_id is null and (p_update ? 'current_question') then
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
      if v_round.paused_remaining_ms is not null then
        v_round.paused_remaining_ms := greatest(1000, least(600000, v_round.paused_remaining_ms + ((p_update->>'adjust_seconds')::integer * 1000)));
      elsif v_round.deadline is not null then
        v_round.deadline := greatest(v_now + interval '1 second', least(v_now + interval '600 seconds', v_round.deadline + ((p_update->>'adjust_seconds')::integer * interval '1 second')));
      end if;
    end if;
    v_room.question_deadline := v_round.deadline;
    v_room.paused_remaining_ms := v_round.paused_remaining_ms;
  end if;

  if v_phase in ('answered','ranking') and v_round.room_id is not null and v_round.revealed_at is null then
    v_round.revealed_at := v_now;
  end if;

  v_room.round_state := v_phase;
  update public.game_rooms set status = v_room.status, round_state = v_room.round_state, current_round = v_room.current_round,
    time_limit = v_room.time_limit, current_question = v_room.current_question, selected_category = v_room.selected_category,
    question_deadline = v_room.question_deadline, paused_remaining_ms = v_room.paused_remaining_ms,
    answered_count = v_room.answered_count, updated_at = v_now where id = v_room.id;
  if v_round.room_id is not null then
    update quiz_private.rounds set started_at = v_round.started_at, deadline = v_round.deadline,
      paused_remaining_ms = v_round.paused_remaining_ms, revealed_at = v_round.revealed_at where id = v_round.id;
  end if;
  return quiz_private.host_snapshot_json(v_room.id);
end;
$$;
