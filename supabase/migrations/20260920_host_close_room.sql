begin;

create or replace function public.quiz_host_close_room(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_room public.game_rooms;
begin
  -- Serialize closing with answer submission and other host actions.
  select * into v_room from public.game_rooms where code = upper(p_code) for update;
  if not found or auth.uid() is null or v_room.host_id is distinct from auth.uid() then
    raise exception 'Somente o organizador pode encerrar esta sala.';
  end if;
  if v_room.status = 'finished' then return; end if;

  -- Keep scores from completed rounds; do not score an interrupted round.
  update public.game_rooms set status = 'finished', round_state = 'idle',
    join_locked = true, question_deadline = null, paused_remaining_ms = null,
    updated_at = clock_timestamp()
  where id = v_room.id;
end $$;

revoke all on function public.quiz_host_close_room(text) from public, anon, authenticated;
grant execute on function public.quiz_host_close_room(text) to authenticated;

commit;
