import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';
import './Admin.css';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';

interface AdminLayoutProps {
  onExit: () => void;
  currentUser: any; // Ajuste para a interface do seu usuário
}

type TabType = 'dashboard' | 'users' | 'settings';

export default function AdminLayout({ onExit, currentUser }: AdminLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <AdminUsers currentUser={currentUser} />;
      case 'settings':
        return (
          <div className="admin-card-grid">
            <div className="admin-stat-card" style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Configurações do Sistema</h2>
              <p style={{ color: '#94a3b8' }}>Opções avançadas estarão disponíveis aqui em breve.</p>
            </div>
          </div>
        );
      default:
        return <AdminDashboard />;
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
            {activeTab === 'settings' && 'Configurações'}
          </h1>
          
          <div className="admin-header-actions">
            <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Logado como: <strong style={{ color: '#fff' }}>{currentUser?.name || 'Administrador'}</strong>
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
