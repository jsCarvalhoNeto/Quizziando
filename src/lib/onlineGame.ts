import { supabase } from './supabaseClient';
export { readPlayerSession, savePlayerSession, newPlayerToken } from './playerSession';
export type { PlayerSession } from './playerSession';

export interface RoomQuestion {
  id: string;
  category_id: string;
  question_text: string;
  time_limit: number;
  explanation?: string | null;
  reference_url?: string | null;
  alternatives: { text: string; isCorrect?: boolean }[];
}

export interface OnlineRoom {
  code: string;
  game_mode: 'open' | 'team' | 'duel';
  status: string;
  round_state: string;
  current_round: number;
  rounds: number;
  time_limit: number;
  current_question: RoomQuestion | null;
  selected_category: { id: string; name: string; color: string; icon: string } | null;
  categories: { id: string; name: string; color: string; icon: string }[];
  question_ids: string[];
  question_deadline: string | null;
  paused_remaining_ms: number | null;
  answered_count: number;
  join_locked: boolean;
  max_players: number;
  reveal_when_all_answered: boolean;
  scoring_mode: 'speed' | 'fixed';
  fixed_points: number;
}

export interface PlayerSnapshot {
  room: OnlineRoom;
  player: { id: string; nickname: string; score: number; team_name?: string | null };
  answer: { answer_index: number; is_correct: boolean | null; points_earned: number | null } | null;
  players: { id: string; nickname: string; score: number; team_name?: string | null }[];
  server_now: string;
}

export async function gameRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (error.code === 'PGRST202') throw new Error('O servidor precisa da atualização de segurança. Aplique a migração 20260919_secure_gameplay antes de jogar online.');
    throw new Error(error.message || 'Não foi possível confirmar a operação. Tente novamente.');
  }
  return data as T;
}
