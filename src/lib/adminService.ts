import { supabase } from './supabaseClient';

export interface ProfileUser {
  id: string;
  nickname: string;
  email?: string;
  role: 'admin' | 'operator' | 'player';
  created_at: string;
}

export interface RoomPlayerRecord {
  id: string;
  room_code: string;
  nickname: string;
  score: number;
  team_name?: string | null;
  joined_at: string;
}

export interface GameRoomRecord {
  id: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished' | string;
  game_mode: 'open' | 'team' | 'duel' | string;
  rounds: number;
  created_at: string;
  operator_email?: string | null;
  host_id?: string | null;
}

export interface AdminStats {
  totalProfiles: number;
  totalRooms: number;
  roomsToday: number;
  totalPlayers: number;
  playersToday: number;
  activeRooms: number;
  recentRooms: GameRoomRecord[];
  recentPlayers: RoomPlayerRecord[];
  pingMs: number;
  connected: boolean;
}

/**
 * Busca estatísticas agregadas do Supabase em paralelo com medição de latência
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const startTime = performance.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  try {
    const [
      profilesRes,
      roomsTotalRes,
      roomsTodayRes,
      activeRoomsRes,
      playersTotalRes,
      playersTodayRes,
      recentRoomsRes,
      recentPlayersRes
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('game_rooms').select('*', { count: 'exact', head: true }),
      supabase.from('game_rooms').select('*', { count: 'exact', head: true }).gte('created_at', startOfDayIso),
      supabase.from('game_rooms').select('*', { count: 'exact', head: true }).in('status', ['waiting', 'playing']),
      supabase.from('room_players').select('*', { count: 'exact', head: true }),
      supabase.from('room_players').select('*', { count: 'exact', head: true }).gte('joined_at', startOfDayIso),
      supabase.from('game_rooms')
        .select('id, code, status, game_mode, rounds, created_at, operator_email, host_id')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('room_players')
        .select('id, room_code, nickname, score, team_name, joined_at')
        .order('joined_at', { ascending: false })
        .limit(10)
    ]);

    const pingMs = Math.round(performance.now() - startTime);

    return {
      totalProfiles: profilesRes.count ?? 0,
      totalRooms: roomsTotalRes.count ?? 0,
      roomsToday: roomsTodayRes.count ?? 0,
      activeRooms: activeRoomsRes.count ?? 0,
      totalPlayers: playersTotalRes.count ?? 0,
      playersToday: playersTodayRes.count ?? 0,
      recentRooms: (recentRoomsRes.data as GameRoomRecord[]) || [],
      recentPlayers: (recentPlayersRes.data as RoomPlayerRecord[]) || [],
      pingMs,
      connected: !profilesRes.error && !roomsTotalRes.error
    };
  } catch (err) {
    console.error('Erro ao carregar estatísticas do admin:', err);
    return {
      totalProfiles: 0,
      totalRooms: 0,
      roomsToday: 0,
      activeRooms: 0,
      totalPlayers: 0,
      playersToday: 0,
      recentRooms: [],
      recentPlayers: [],
      pingMs: -1,
      connected: false
    };
  }
}

/**
 * Busca a lista de perfis reais da tabela 'profiles'
 */
export async function fetchProfiles(): Promise<ProfileUser[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar perfis:', error.message);
      return [];
    }

    return (data as ProfileUser[]) || [];
  } catch (err) {
    console.error('Falha na requisição de perfis:', err);
    return [];
  }
}

/**
 * Busca histórico de jogadores das salas ('room_players')
 */
export async function fetchRoomPlayers(limit = 100): Promise<RoomPlayerRecord[]> {
  try {
    const { data, error } = await supabase
      .from('room_players')
      .select('id, room_code, nickname, score, team_name, joined_at')
      .order('joined_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Erro ao buscar jogadores de salas:', error.message);
      return [];
    }

    return (data as RoomPlayerRecord[]) || [];
  } catch (err) {
    console.error('Falha na requisição de jogadores:', err);
    return [];
  }
}

/**
 * Atualiza o cargo / role de um perfil no Supabase
 */
export async function updateProfileRole(
  userId: string, 
  newRole: 'admin' | 'operator' | 'player'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado' };
  }
}

/**
 * Exclui um perfil da tabela 'profiles'
 */
export async function deleteProfile(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado' };
  }
}

/**
 * Cria ou atualiza um usuário / perfil
 */
export async function createOrUpsertProfile(
  profile: Partial<ProfileUser>
): Promise<{ success: boolean; error?: string; data?: ProfileUser }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as ProfileUser };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado' };
  }
}

/**
 * Busca todas as salas com paginação para a auditoria
 */
export async function fetchAllRooms(limit = 100): Promise<GameRoomRecord[]> {
  try {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('id, code, status, game_mode, rounds, created_at, operator_email, host_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as GameRoomRecord[]) || [];
  } catch (err) {
    console.error('Erro ao buscar salas:', err);
    return [];
  }
}

/**
 * Exclui uma sala de jogo do Supabase
 */
export async function deleteRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('game_rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao excluir sala' };
  }
}
