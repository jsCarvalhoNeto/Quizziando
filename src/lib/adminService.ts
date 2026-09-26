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
  totalCategories: number;
  totalQuestions: number;
  totalFolders: number;
  recentRooms: GameRoomRecord[];
  recentPlayers: RoomPlayerRecord[];
  pingMs: number;
  connected: boolean;
}

export interface ContentStats {
  totalCategories: number;
  totalQuestions: number;
  totalFolders: number;
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
      categoriesRes,
      questionsRes,
      foldersRes,
      recentRoomsRes,
      recentPlayersRes
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('game_rooms').select('*', { count: 'exact', head: true }),
      supabase.from('game_rooms').select('*', { count: 'exact', head: true }).gte('created_at', startOfDayIso),
      supabase.from('game_rooms').select('*', { count: 'exact', head: true }).in('status', ['waiting', 'playing']),
      supabase.from('room_players').select('*', { count: 'exact', head: true }),
      supabase.from('room_players').select('*', { count: 'exact', head: true }).gte('joined_at', startOfDayIso),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('category_folders').select('*', { count: 'exact', head: true }),
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
      totalCategories: categoriesRes.count ?? 0,
      totalQuestions: questionsRes.count ?? 0,
      totalFolders: foldersRes.count ?? 0,
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
      totalCategories: 0,
      totalQuestions: 0,
      totalFolders: 0,
      recentRooms: [],
      recentPlayers: [],
      pingMs: -1,
      connected: false
    };
  }
}

/**
 * Busca estatísticas específicas de conteúdo (quizzes, categorias e perguntas)
 */
export async function fetchContentStats(): Promise<ContentStats> {
  try {
    const [categoriesRes, questionsRes, foldersRes] = await Promise.all([
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('category_folders').select('*', { count: 'exact', head: true })
    ]);

    return {
      totalCategories: categoriesRes.count ?? 0,
      totalQuestions: questionsRes.count ?? 0,
      totalFolders: foldersRes.count ?? 0
    };
  } catch (err) {
    console.error('Erro ao buscar contagens de conteúdo do Supabase:', err);
    return {
      totalCategories: 0,
      totalQuestions: 0,
      totalFolders: 0
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
      .select('*')
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

export const DEFAULT_OPERATOR_PASSWORD = 'quizziando123';

/**
 * Reseta a senha de um operador/usuário para a senha padrão 'quizziando123'
 */
export async function resetOperatorPassword(
  userId: string,
  newPassword = DEFAULT_OPERATOR_PASSWORD
): Promise<{ success: boolean; message?: string; error?: string; sqlNeeded?: boolean }> {
  try {
    const { data, error } = await supabase.rpc('admin_reset_user_password', {
      target_user_id: userId,
      new_password: newPassword
    });

    if (error) {
      const isMissingFunction = 
        error.code === '42883' || 
        error.code === 'PGRST202' ||
        error.message?.toLowerCase().includes('function') || 
        error.message?.toLowerCase().includes('admin_reset_user_password');

      if (isMissingFunction) {
        return {
          success: false,
          sqlNeeded: true,
          error: 'A função SQL "admin_reset_user_password" precisa ser executada no Supabase para habilitar o reset de senhas direto no banco.'
        };
      }

      return {
        success: false,
        error: error.message || 'Falha ao redefinir a senha no Supabase.'
      };
    }

    if (data && typeof data === 'object') {
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Não foi possível redefinir a senha deste usuário.'
        };
      }
      return {
        success: true,
        message: data.message || `Senha resetada com sucesso para ${newPassword}!`
      };
    }

    return {
      success: true,
      message: `Senha redefinida com sucesso para "${newPassword}".`
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao conectar com o serviço de autenticação.'
    };
  }
}

export interface AdminCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  folder_id?: string | null;
  created_by?: string;
  created_at?: string;
  folder_name?: string;
  questions_count?: number;
}

export interface AdminFolder {
  id: string;
  name: string;
  color?: string;
}

export interface AdminQuestion {
  id: string;
  category_id: string;
  question_text: string;
  time_limit: number;
  explanation?: string;
  reference_url?: string;
  difficulty?: string;
  tags?: string[];
  created_at?: string;
  category_name?: string;
  category_color?: string;
  alternatives?: {
    id?: string;
    alternative_text: string;
    is_correct: boolean;
  }[];
}

/**
 * Busca todas as categorias com contagem de perguntas e nome da pasta
 */
export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  try {
    const [catsRes, foldersRes, questionsRes] = await Promise.all([
      supabase.from('categories').select('*').order('name', { ascending: true }),
      supabase.from('category_folders').select('id, name'),
      supabase.from('questions').select('category_id')
    ]);

    if (catsRes.error) throw catsRes.error;

    const folderMap = new Map((foldersRes.data || []).map(f => [f.id, f.name]));
    const qCountMap = new Map<string, number>();
    (questionsRes.data || []).forEach(q => {
      if (q.category_id) {
        qCountMap.set(q.category_id, (qCountMap.get(q.category_id) || 0) + 1);
      }
    });

    return (catsRes.data || []).map(c => ({
      ...c,
      folder_name: c.folder_id ? folderMap.get(c.folder_id) || 'Sem Pasta' : 'Sem Pasta',
      questions_count: qCountMap.get(c.id) || 0
    }));
  } catch (err) {
    console.error('Erro ao buscar categorias do admin:', err);
    return [];
  }
}

/**
 * Busca todas as pastas de categorias
 */
export async function fetchAdminFolders(): Promise<AdminFolder[]> {
  try {
    const { data, error } = await supabase
      .from('category_folders')
      .select('id, name, color')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar pastas:', err);
    return [];
  }
}

/**
 * Busca lista de perguntas com alternativas e dados da categoria
 */
export async function fetchAdminQuestions(options?: {
  categoryId?: string;
  limit?: number;
}): Promise<AdminQuestion[]> {
  try {
    const limit = options?.limit ?? 1500;
    let query = supabase
      .from('questions')
      .select(`
        id,
        category_id,
        question_text,
        time_limit,
        explanation,
        reference_url,
        difficulty,
        tags,
        created_at,
        categories ( id, name, color ),
        alternatives ( id, alternative_text, is_correct )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.categoryId && options.categoryId !== 'all') {
      query = query.eq('category_id', options.categoryId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((q: any) => ({
      id: q.id,
      category_id: q.category_id,
      question_text: q.question_text,
      time_limit: q.time_limit,
      explanation: q.explanation,
      reference_url: q.reference_url,
      difficulty: q.difficulty,
      tags: q.tags,
      created_at: q.created_at,
      category_name: q.categories?.name || 'Sem Categoria',
      category_color: q.categories?.color || '#3b82f6',
      alternatives: q.alternatives || []
    }));
  } catch (err) {
    console.error('Erro ao buscar perguntas do admin:', err);
    return [];
  }
}

/**
 * Exclui uma questão do Supabase
 */
export async function deleteAdminQuestion(questionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir pergunta' };
  }
}

/**
 * Exclui uma categoria do Supabase
 */
export async function deleteAdminCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir categoria' };
  }
}

