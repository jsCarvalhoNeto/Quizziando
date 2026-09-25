import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  PlayCircle,
  Settings, 
  LogOut, 
  ShieldCheck,
  ChevronLeft,
  Database,
  Activity,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import './Admin.css';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminRooms from './AdminRooms';
import { supabase } from '../../lib/supabaseClient';

interface AdminLayoutProps {
  onExit: () => void;
  currentUser: any;
}

type TabType = 'dashboard' | 'users' | 'rooms' | 'settings';

export default function AdminLayout({ onExit, currentUser }: AdminLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'idle' | 'ok' | 'fail'; ms?: number; message?: string }>({ status: 'idle' });

  const testSupabaseConnection = async () => {
    setTestingPing(true);
    const start = performance.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const ms = Math.round(performance.now() - start);
      if (error) {
        setPingResult({ status: 'fail', ms, message: error.message });
      } else {
        setPingResult({ status: 'ok', ms, message: 'Conexão ativa com o banco Postgres do Supabase' });
      }
    } catch (err: any) {
      setPingResult({ status: 'fail', message: err?.message || 'Erro de rede' });
    } finally {
      setTestingPing(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard onNavigateTab={(tab) => setActiveTab(tab)} />;
      case 'users':
        return <AdminUsers currentUser={currentUser} />;
      case 'rooms':
        return <AdminRooms />;
      case 'settings':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="admin-stat-card" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                  <Database size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                    Infraestrutura do Supabase
                  </h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                    Parâmetros e monitoramento de conexão com o banco de dados
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Endpoint URL
                  </div>
                  <div style={{ fontWeight: 600, color: '#38bdf8', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    https://nttbpmnnzrrhijobinui.supabase.co
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Tabelas Integradas
                  </div>
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                    profiles, game_rooms, room_players, categories
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Canal Realtime
                  </div>
                  <div style={{ fontWeight: 600, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={16} />
                    Postgres CDC & Broadcast Ativo
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <button 
                  onClick={testSupabaseConnection} 
                  disabled={testingPing}
                  className="admin-btn primary"
                >
                  <RefreshCw size={16} style={{ animation: testingPing ? 'spin 1s linear infinite' : 'none' }} />
                  {testingPing ? 'Testando Conexão...' : 'Testar Conexão Supabase'}
                </button>

                {pingResult.status === 'ok' && (
                  <span style={{ color: '#4ade80', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={18} />
                    {pingResult.message} ({pingResult.ms}ms)
                  </span>
                )}

                {pingResult.status === 'fail' && (
                  <span style={{ color: '#f87171', fontSize: '0.9rem' }}>
                    Falha no teste: {pingResult.message}
                  </span>
                )}
              </div>
            </div>

            <div className="admin-stat-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#f8fafc' }}>
                Permissões Administrativas
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                O painel administrativo consome diretamente as tabelas do Supabase. Alterações nas permissões de usuários são salvas na tabela <code style={{ color: '#38bdf8' }}>profiles</code>. Certifique-se de que as políticas de RLS e triggers de banco correspondentes estejam habilitadas para total sincronização.
              </p>
            </div>
          </div>
        );
      default:
        return <AdminDashboard onNavigateTab={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <ShieldCheck size={32} color="#fbbf24" />
          <span>Quizziando Admin</span>
        </div>
        
        <nav className="admin-nav">
          <button 
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={20} />
            Gerenciar Usuários
          </button>

          <button 
            className={`admin-nav-item ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            <PlayCircle size={20} />
            Salas & Partidas
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            Configurações
          </button>

          <div style={{ marginTop: 'auto' }}>
            <button className="admin-nav-item" onClick={onExit} style={{ color: '#f87171' }}>
              <ChevronLeft size={20} />
              Sair do Painel
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">
            {activeTab === 'dashboard' && 'Visão Geral do Sistema'}
            {activeTab === 'users' && 'Controle de Usuários'}
            {activeTab === 'rooms' && 'Gerenciamento de Salas & Partidas'}
            {activeTab === 'settings' && 'Configurações do Supabase'}
          </h1>
          
          <div className="admin-header-actions">
            <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Logado como: <strong style={{ color: '#fff' }}>{currentUser?.name || currentUser?.email || 'Administrador'}</strong>
            </span>
            <button className="admin-btn outline" onClick={onExit}>
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </header>

        <div className="admin-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
