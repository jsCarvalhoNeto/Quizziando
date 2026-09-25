import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  RefreshCw, 
  Trash2, 
  Radio, 
  CheckCircle2, 
  Clock, 
  Filter 
} from 'lucide-react';
import { fetchAllRooms, deleteRoom, type GameRoomRecord } from '../../lib/adminService';

export default function AdminRooms() {
  const [rooms, setRooms] = useState<GameRoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'playing' | 'finished'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllRooms(100);
      setRooms(data);
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleDelete = async (roomId: string, code: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente a sala "${code}" do Supabase?`)) {
      return;
    }

    setRooms(prev => prev.filter(r => r.id !== roomId));
    const res = await deleteRoom(roomId);
    if (!res.success) {
      setFeedback(`Erro ao excluir sala: ${res.error}`);
      loadRooms();
    } else {
      setFeedback(`Sala ${code} excluída com sucesso!`);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = 
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.operator_email && r.operator_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.game_mode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {feedback && (
        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          {feedback}
        </div>
      )}

      {/* Controles */}
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
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar por código ou modo..." 
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
            <Filter size={14} style={{ color: '#94a3b8', marginLeft: '6px' }} />
            {(['all', 'playing', 'waiting', 'finished'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`admin-btn ${statusFilter === st ? 'primary' : 'outline'}`}
                style={{ fontSize: '0.8rem', padding: '6px 12px', border: 'none' }}
              >
                {st === 'all' && 'Todas'}
                {st === 'playing' && 'Em Jogo'}
                {st === 'waiting' && 'Aguardando'}
                {st === 'finished' && 'Finalizadas'}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={loadRooms} 
          disabled={loading} 
          className="admin-btn outline"
          title="Recarregar salas"
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar Lista ({filteredRooms.length})
        </button>
      </div>

      {/* Tabela de Salas */}
      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código da Sala</th>
                <th>Modo de Jogo</th>
                <th>Rodadas</th>
                <th>Status</th>
                <th>Data / Hora de Criação</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map(room => {
                const isPlaying = room.status === 'playing';
                const isFinished = room.status === 'finished';
                return (
                  <tr key={room.id}>
                    <td>
                      <span 
                        style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 700, 
                          fontSize: '1.05rem',
                          color: '#38bdf8', 
                          backgroundColor: 'rgba(56, 189, 248, 0.1)', 
                          padding: '4px 10px', 
                          borderRadius: '6px',
                          border: '1px solid rgba(56, 189, 248, 0.25)'
                        }}
                      >
                        {room.code}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {room.game_mode === 'open' && 'Aberto (Individual)'}
                      {room.game_mode === 'team' && 'Em Equipes'}
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
                      {new Date(room.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          className="admin-btn danger" 
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                          title="Excluir sala do banco de dados"
                          onClick={() => handleDelete(room.id, room.code)}
                        >
                          <Trash2 size={15} />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    {loading ? 'Carregando salas do Supabase...' : 'Nenhuma sala encontrada com os filtros selecionados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
