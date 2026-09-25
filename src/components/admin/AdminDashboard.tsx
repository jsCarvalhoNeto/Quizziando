import React from 'react';
import { Users, Activity, PlayCircle } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <>
      <div className="admin-card-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="admin-stat-value">1,248</div>
            <div className="admin-stat-label">Usuários Totais</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="admin-stat-value">142</div>
            <div className="admin-stat-label">Usuários Ativos (Hoje)</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
            <PlayCircle size={24} />
          </div>
          <div>
            <div className="admin-stat-value">4,892</div>
            <div className="admin-stat-label">Partidas Jogadas</div>
          </div>
        </div>
      </div>

      <div className="admin-card-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="admin-stat-card" style={{ minHeight: '300px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#f8fafc' }}>Atividade Recente</h2>
          <p style={{ color: '#94a3b8' }}>Nenhum alerta crítico no sistema hoje.</p>
        </div>
      </div>
    </>
  );
}
