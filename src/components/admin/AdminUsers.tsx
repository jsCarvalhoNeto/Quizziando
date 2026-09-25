import { useState, useEffect, useCallback } from 'react';
import { 
  Trash2, 
  Shield, 
  ShieldCheck, 
  Search, 
  UserPlus, 
  RefreshCw, 
  Users as UsersIcon, 
  Gamepad2, 
  Check, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { 
  fetchProfiles, 
  fetchRoomPlayers, 
  updateProfileRole, 
  deleteProfile, 
  createOrUpsertProfile,
  type ProfileUser, 
  type RoomPlayerRecord 
} from '../../lib/adminService';

interface AdminUsersProps {
  currentUser: any;
}

export default function AdminUsers({ currentUser }: AdminUsersProps) {
  const [activeTab, setActiveTab] = useState<'profiles' | 'players'>('profiles');
  const [profiles, setProfiles] = useState<ProfileUser[]>([]);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal para criar novo operador/usuário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'operator' | 'player'>('operator');
  const [savingUser, setSavingUser] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const [profilesData, playersData] = await Promise.all([
        fetchProfiles(),
        fetchRoomPlayers(100)
      ]);

      // Se o usuário logado não estiver no retorno (por exemplo, se for recém-autenticado), mescla para garantir visibilidade
      let finalProfiles = [...profilesData];
      if (currentUser?.name && !finalProfiles.some(p => p.nickname === currentUser.name || p.email === currentUser.name)) {
        finalProfiles.unshift({
          id: currentUser.id || 'current-admin',
          nickname: currentUser.name,
          email: currentUser.email || currentUser.name,
          role: currentUser.role || 'admin',
          created_at: new Date().toISOString()
        });
      }

      setProfiles(finalProfiles);
      setRoomPlayers(playersData);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao carregar dados do Supabase: ' + (err.message || 'Falha de rede') });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Limpa feedback após 5 segundos
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  // Alterar permissão
  const handleToggleRole = async (user: ProfileUser) => {
    const nextRole: 'admin' | 'operator' | 'player' = 
      user.role === 'admin' ? 'operator' : user.role === 'operator' ? 'admin' : 'operator';

    // Atualização otimista na tela
    setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, role: nextRole } : p));

    const res = await updateProfileRole(user.id, nextRole);
    if (!res.success) {
      // Se RLS ou constraint do banco barrar, informa o admin
      setFeedbackMsg({
        type: 'info',
        text: `Alteração aplicada na visualização. Nota do Supabase: ${res.error || 'Sujeito a permissões RLS no servidor.'}`
      });
    } else {
      setFeedbackMsg({ type: 'success', text: `Permissão de "${user.nickname}" alterada para ${nextRole.toUpperCase()} com sucesso!` });
    }
  };

  // Excluir perfil
  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o usuário "${name}" do banco de dados?`)) {
      return;
    }

    setProfiles(prev => prev.filter(p => p.id !== id));
    const res = await deleteProfile(id);
    if (!res.success) {
      setFeedbackMsg({
        type: 'error',
        text: `Erro ao excluir do Supabase: ${res.error}`
      });
      loadData(); // Reverte
    } else {
      setFeedbackMsg({ type: 'success', text: `Usuário "${name}" removido com sucesso!` });
    }
  };

  // Adicionar Usuário Manualmente
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNickname.trim()) return;

    setSavingUser(true);
    const newId = crypto.randomUUID();
    const res = await createOrUpsertProfile({
      id: newId,
      nickname: newNickname.trim(),
      role: newRole,
      created_at: new Date().toISOString()
    });

    setSavingUser(false);
    if (res.success && res.data) {
      setProfiles(prev => [res.data!, ...prev]);
      setFeedbackMsg({ type: 'success', text: `Usuário "${newNickname}" criado com sucesso!` });
      setIsModalOpen(false);
      setNewNickname('');
    } else {
      // Adiciona localmente caso política RLS de inserção requeira auth.uid
      const fallbackUser: ProfileUser = {
        id: newId,
        nickname: newNickname.trim(),
        role: newRole,
        created_at: new Date().toISOString()
      };
      setProfiles(prev => [fallbackUser, ...prev]);
      setFeedbackMsg({ 
        type: 'info', 
        text: `Usuário registrado na sessão. Nota: ${res.error || 'A criação direta em profiles requer credenciais auth vinculadas.'}` 
      });
      setIsModalOpen(false);
      setNewNickname('');
    }
  };

  const filteredProfiles = profiles.filter(u => 
    (u.nickname && u.nickname.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.id && u.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPlayers = roomPlayers.filter(p => 
    (p.nickname && p.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.room_code && p.room_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Feedback Toast / Alert */}
      {feedbackMsg && (
        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: feedbackMsg.type === 'success' 
              ? 'rgba(34, 197, 94, 0.15)' 
              : feedbackMsg.type === 'error' 
              ? 'rgba(239, 68, 68, 0.15)' 
              : 'rgba(56, 189, 248, 0.15)',
            border: `1px solid ${
              feedbackMsg.type === 'success' 
                ? 'rgba(34, 197, 94, 0.4)' 
                : feedbackMsg.type === 'error' 
                ? 'rgba(239, 68, 68, 0.4)' 
                : 'rgba(56, 189, 248, 0.4)'
            }`,
            color: feedbackMsg.type === 'success' 
              ? '#4ade80' 
              : feedbackMsg.type === 'error' 
              ? '#f87171' 
              : '#38bdf8'
          }}
        >
          {feedbackMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Barra Superior de Controles e Filtros */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Alternador de Abas: Perfis vs Histórico de Jogadores */}
          <div style={{ display: 'flex', background: '#1e293b', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`admin-btn ${activeTab === 'profiles' ? 'primary' : 'outline'}`}
              style={{ fontSize: '0.85rem', padding: '8px 14px', border: 'none' }}
            >
              <UsersIcon size={16} />
              Contas & Perfis ({profiles.length})
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`admin-btn ${activeTab === 'players' ? 'primary' : 'outline'}`}
              style={{ fontSize: '0.85rem', padding: '8px 14px', border: 'none' }}
            >
              <Gamepad2 size={16} />
              Histórico de Jogadores ({roomPlayers.length})
            </button>
          </div>

          {/* Campo de Busca */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={activeTab === 'profiles' ? 'Buscar nome, email ou ID...' : 'Buscar apelido ou sala...'} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={loadData} 
            disabled={loading} 
            className="admin-btn outline"
            title="Recarregar dados do Supabase"
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
          {activeTab === 'profiles' && (
            <button 
              className="admin-btn primary"
              onClick={() => setIsModalOpen(true)}
            >
              <UserPlus size={18} />
              Novo Usuário
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Contas e Perfis */}
      {activeTab === 'profiles' && (
        <div className="admin-table-container">
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuário / Apelido</th>
                  <th>ID Supabase</th>
                  <th>Cargo / Permissão</th>
                  <th>Data de Cadastro</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map(user => {
                  const isAdmin = user.role === 'admin';
                  const isOperator = user.role === 'operator';
                  return (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {user.nickname || 'Sem Apelido'}
                            {currentUser?.name === user.nickname && (
                              <span style={{ fontSize: '0.7rem', color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                Você
                              </span>
                            )}
                          </span>
                          {user.email && (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                              {user.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span 
                          style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.8rem', 
                            color: '#94a3b8',
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            padding: '3px 6px',
                            borderRadius: '4px'
                          }}
                          title={user.id}
                        >
                          {user.id.length > 18 ? `${user.id.substring(0, 14)}...` : user.id}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.role}`}>
                          {isAdmin ? 'Administrador' : isOperator ? 'Operador' : 'Jogador'}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="admin-btn outline" 
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            title={isAdmin ? "Rebaixar para Operador" : "Promover para Administrador"}
                            onClick={() => handleToggleRole(user)}
                          >
                            {isAdmin ? <Shield size={15} style={{ color: '#facc15' }} /> : <ShieldCheck size={15} style={{ color: '#60a5fa' }} />}
                            {isAdmin ? 'Rebaixar' : 'Promover'}
                          </button>
                          <button 
                            className="admin-btn danger" 
                            style={{ padding: '6px 8px' }} 
                            title="Remover Perfil"
                            onClick={() => handleDeleteUser(user.id, user.nickname)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      {loading ? 'Carregando dados do Supabase...' : 'Nenhum usuário cadastrado encontrado.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela de Histórico de Jogadores (room_players) */}
      {activeTab === 'players' && (
        <div className="admin-table-container">
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Apelido do Jogador</th>
                  <th>Código da Sala</th>
                  <th>Equipe</th>
                  <th>Pontuação</th>
                  <th>Data de Entrada</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map(player => (
                  <tr key={player.id}>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {player.nickname}
                    </td>
                    <td>
                      <span 
                        style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 700, 
                          color: '#38bdf8', 
                          backgroundColor: 'rgba(56, 189, 248, 0.1)', 
                          padding: '3px 8px', 
                          borderRadius: '6px',
                          border: '1px solid rgba(56, 189, 248, 0.2)'
                        }}
                      >
                        {player.room_code}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8' }}>
                      {player.team_name || 'Individual'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#fbbf24' }}>
                      {player.score.toLocaleString('pt-BR')} pts
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      {player.joined_at ? new Date(player.joined_at).toLocaleString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}

                {filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      {loading ? 'Carregando registros do Supabase...' : 'Nenhum histórico de jogador encontrado.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Adicionar Usuário */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>
                Cadastrar Novo Perfil
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Nome / Apelido de Acesso
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: professor_marcos" 
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Nível de Acesso (Cargo)
                </label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    outline: 'none'
                  }}
                >
                  <option value="operator">Operador (Professor / Criador)</option>
                  <option value="admin">Administrador (Controle Total)</option>
                  <option value="player">Jogador (Estudante)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="admin-btn outline"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={savingUser} 
                  className="admin-btn primary"
                >
                  {savingUser ? 'Salvando...' : 'Salvar no Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
