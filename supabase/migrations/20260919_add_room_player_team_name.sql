begin;

-- Online teams use room_players; game_players belongs to the older game model.
-- This column was referenced by the team RPCs but missing from the live table.
alter table public.room_players
  add column if not exists team_name text;

commit;
