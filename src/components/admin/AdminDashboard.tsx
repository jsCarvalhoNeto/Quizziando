import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Activity, 
  PlayCircle, 
  Gamepad2, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Flame,
  Radio,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { fetchAdminStats, type AdminStats } from '../../lib/adminService';

interface AdminDashboardProps {
  onNavigateTab?: (tab: 'dashboard' | 'users' | 'rooms' | 'quizzes' | 'questions' | 'settings') => void;
}

export default function AdminDashboard({ onNavigateTab }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'players'>('rooms');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Falha ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    // Atualização automática a cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Agora mesmo';
      if (diffMin < 60) return `Há ${diffMin} min`;
      if (diffHour < 24) return `Há ${diffHour}h`;
      if (diffDay === 1) return 'Ontem';
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner de Status do Supabase */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
          borderRadius: '14px',
          border: '1px solid #334155',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: stats?.connected ? '#22c55e' : '#ef4444',
              boxShadow: stats?.connected ? '0 0 10px #22c55e' : '0 0 10px #ef4444',
              animation: stats?.connected ? 'pulse 2s infinite' : 'none'
            }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                Supabase Realtime Cloud
              </span>
              <span 
                style={{ 
                  fontSize: '0.75rem', 
                  padding: '2px 8px', 
                  borderRadius: '6px', 
                  backgroundColor: stats?.connected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: stats?.connected ? '#4ade80' : '#f87171',
                  border: `1px solid ${stats?.connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}
              >
                {stats?.connected ? 'Conectado e Operacional' : 'Erro de Conexão'}
              </span>
              {stats?.pingMs !== undefined && stats.pingMs > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Latência: {stats.pingMs}ms
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
              Instância: <code style={{ color: '#38bdf8' }}>nttbpmnnzrrhijobinui.supabase.co</code> • Última sincronização: {lastUpdated.toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>

        <button 
          onClick={loadStats} 
          disabled={loading}
          className="admin-btn outline"
          style={{ fontSize: '0.85rem', padding: '8px 14px' }}
          title="Recarregar dados do Supabase"
        >
          <RefreshCw size={16} className={loading ? 'spin-anim' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Sincronizando...' : 'Atualizar Dados'}
        </button>
      </div>

      {/* Grid de Cards Estatísticos Principais */}
      <div className="admin-card-grid">
        {/* Card 1: Usuários / Perfis */}
        <div 
          className="admin-stat-card" 
          onClick={() => onNavigateTab && onNavigateTab('users')}
          style={{ cursor: onNavigateTab ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
              <Users size={24} />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#60a5fa', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Perfis
            </span>
          </div>
          <div>
            <div className="admin-stat-value">
              {loading && !stats ? '...' : (stats?.totalProfiles?.toLocaleString('pt-BR') || '0')}
            </div>
            <div className="admin-stat-label">Usuários Cadastrados</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '8px' }}>
            Contas de operadores no Supabase
          </div>
        </div>

        {/* Card 2: Partidas / Salas Totais */}
        <div 
          className="admin-stat-card"
          onClick={() => onNavigateTab && onNavigateTab('rooms')}
          style={{ cursor: onNavigateTab ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
              <PlayCircle size={24} />
            </div>
            {stats && stats.roomsToday > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={12} /> +{stats.roomsToday} hoje
              </span>
            )}
          </div>
          <div>
            <div className="admin-stat-value">
              {loading && !stats ? '...' : (stats?.totalRooms?.toLocaleString('pt-BR') || '0')}
            </div>
            <div className="admin-stat-label">Partidas Criadas (Salas)</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '8px' }}>
            Total acumulado em <code style={{ color: '#fbbf24' }}>game_rooms</code>
          </div>
        </div>

        {/* Card 3: Jogadores Registrados */}
        <div className="admin-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
              <Gamepad2 size={24} />
            </div>
            {stats && stats.playersToday > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                +{stats.playersToday} ativos hoje
              </span>
            )}
          </div>
          <div>
            <div className="admin-stat-value">
              {loading && !stats ? '...' : (stats?.totalPlayers?.toLocaleString('pt-BR') || '0')}
            </div>
            <div className="admin-stat-label">Jogadores em Partidas</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '8px' }}>
            Participantes registrados em salas
          </div>
        </div>

        {/* Card 4: Salas Ativas Agora */}
        <div className="admin-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
              <Activity size={24} />
            </div>
            {stats && stats.activeRooms > 0 ? (
              <span style={{ fontSize: '0.75rem', color: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={12} className="spin-anim" /> Ao vivo
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', backgroundColor: 'rgba(148, 163, 184, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                Em espera
              </span>
            )}
          </div>
          <div>
            <div className="admin-stat-value">
              {loading && !stats ? '...' : (stats?.activeRooms?.toLocaleString('pt-BR') || '0')}
            </div>
            <div className="admin-stat-label">Salas Ativas no Momento</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '8px' }}>
            Aguardando ou em jogo agora
          </div>
        </div>

        {/* Card 5: Quizzes e Categorias */}
        <div 
          className="admin-stat-card"
          onClick={() => onNavigateTab && onNavigateTab('quizzes')}
          style={{ cursor: onNavigateTab ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
              <BookOpen size={24} />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#c084fc', backgroundColor: 'rgba(168, 85, 247, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Supabase
            </span>
          </div>
          <div>
            <div className="admin-stat-value">
              {loading && !stats ? '...' : (stats?.totalCategories?.toLocaleString('pt-BR') || '0')}
            </div>
            <div className="admin-stat-label">Quizzes & Categorias</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '8px' }}>
            Total na tabela <code style={{ color: '#c084fc' }}>categories</code>
          </div>
        </div>

        {/* Card 6: Questões Criadas */}
        <div 
          className="admin-stat-card"
          onClick={() => onNavigateTab && onNavigateTab('questions')}
          style={{ cursor: onNavigateTab ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' }}>
              <HelpCircle size={24} />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', backgroundColor: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Banco
            </span>
          </div>
          <div>
            <div className="admin-stat-value">
              {loading && !stats ? '...' : (stats?.totalQuestions?.toLocaleString('pt-BR') || '0')}
            </div>
            <div className="admin-stat-label">Questões Criadas</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '8px' }}>
            Total na tabela <code style={{ color: '#38bdf8' }}>questions</code>
          </div>
        </div>
      </div>

      {/* Seção de Atividade Recente Integrada com Supabase */}
      <div className="admin-table-container">
        <div 
          style={{ 
            padding: '20px 24px', 
            borderBottom: '1px solid #334155', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Feed de Atividade em Tempo Real
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Registros ao vivo recuperados diretamente das tabelas do banco de dados
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
            <button
              onClick={() => setActiveSubTab('rooms')}
              className={`admin-btn ${activeSubTab === 'rooms' ? 'primary' : 'outline'}`}
              style={{ fontSize: '0.8rem', padding: '6px 14px', border: 'none' }}
            >
              Últimas Salas ({stats?.recentRooms.length || 0})
            </button>
            <button
              onClick={() => setActiveSubTab('players')}
              className={`admin-btn ${activeSubTab === 'players' ? 'primary' : 'outline'}`}
              style={{ fontSize: '0.8rem', padding: '6px 14px', border: 'none' }}
            >
              Últimos Jogadores ({stats?.recentPlayers.length || 0})
            </button>
          </div>
        </div>

        {activeSubTab === 'rooms' ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código da Sala</th>
                  <th>Modo de Jogo</th>
                  <th>Rodadas</th>
                  <th>Status</th>
                  <th>Criada em</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentRooms && stats.recentRooms.length > 0 ? (
                  stats.recentRooms.map((room) => {
                    const isFinished = room.status === 'finished';
                    const isPlaying = room.status === 'playing';
                    return (
                      <tr key={room.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span 
                              style={{ 
                                fontFamily: 'monospace', 
                                fontWeight: 700, 
                                fontSize: '1rem',
                                color: '#38bdf8', 
                                backgroundColor: 'rgba(56, 189, 248, 0.1)', 
                                padding: '3px 8px', 
                                borderRadius: '6px',
                                border: '1px solid rgba(56, 189, 248, 0.2)'
                              }}
                            >
                              {room.code}
                            </span>
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>
                          {room.game_mode === 'open' && 'Aberto (Individual)'}
                          {room.game_mode === 'team' && 'Equipes'}
                          {room.game_mode === 'duel' && 'Duelo 1v1'}
                          {!['open', 'team', 'duel'].includes(room.game_mode) && room.game_mode}
                        </td>
                        <td>{room.rounds} rodadas</td>
                        <td>
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              backgroundColor: isPlaying 
                                ? 'rgba(34, 197, 94, 0.2)' 
                                : isFinished 
                                ? 'rgba(148, 163, 184, 0.15)' 
                                : 'rgba(234, 179, 8, 0.2)',
                              color: isPlaying 
                                ? '#4ade80' 
                                : isFinished 
                                ? '#94a3b8' 
                                : '#facc15',
                              border: `1px solid ${
                                isPlaying 
                                  ? 'rgba(34, 197, 94, 0.4)' 
                                  : isFinished 
                                  ? 'rgba(148, 163, 184, 0.3)' 
                                  : 'rgba(234, 179, 8, 0.4)'
                              }`
                            }}
                          >
                            {isPlaying && <Radio size={12} />}
                            {isFinished && <CheckCircle2 size={12} />}
                            {!isPlaying && !isFinished && <Clock size={12} />}
                            {isPlaying ? 'Em Jogo' : isFinished ? 'Finalizada' : 'Aguardando'}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                          <span title={new Date(room.created_at).toLocaleString('pt-BR')}>
                            {formatRelativeTime(room.created_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      {loading ? 'Carregando salas do Supabase...' : 'Nenhuma sala registrada recentemente.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Apelido do Jogador</th>
                  <th>Sala</th>
                  <th>Equipe</th>
                  <th>Pontos Obtidos</th>
                  <th>Entrou em</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentPlayers && stats.recentPlayers.length > 0 ? (
                  stats.recentPlayers.map((player) => (
                    <tr key={player.id}>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {player.nickname}
                      </td>
                      <td>
                        <span 
                          style={{ 
                            fontFamily: 'monospace', 
                            color: '#38bdf8', 
                            backgroundColor: 'rgba(56, 189, 248, 0.1)', 
                            padding: '2px 6px', 
                            borderRadius: '4px' 
                          }}
                        >
                          {player.room_code}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8' }}>
                        {player.team_name || 'Individual'}
                      </td>
                      <td style={{ fontWeight: 600, color: '#fbbf24' }}>
                        {player.score.toLocaleString('pt-BR')} pts
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                        <span title={new Date(player.joined_at).toLocaleString('pt-BR')}>
                          {formatRelativeTime(player.joined_at)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      {loading ? 'Carregando jogadores do Supabase...' : 'Nenhum jogador registrado recentemente.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
