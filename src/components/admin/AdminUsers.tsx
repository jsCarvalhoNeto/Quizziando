import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Pencil, Trash2, Shield, ShieldOff, Search, UserPlus } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'user';
  created_at: string;
}

// MOCK DATA apenas para visualização até o backend estar com a tabela formatada
const MOCK_USERS: UserData[] = [
  { id: '1', name: 'João Silva', email: 'joao@quizziando.com', role: 'admin', created_at: '2026-09-01T10:00:00Z' },
  { id: '2', name: 'Maria Souza', email: 'maria@escola.br', role: 'operator', created_at: '2026-09-10T14:30:00Z' },
  { id: '3', name: 'Carlos Professor', email: 'carlos@escola.br', role: 'operator', created_at: '2026-09-15T09:15:00Z' },
  { id: '4', name: 'Ana Aluna', email: 'ana@estudante.br', role: 'user', created_at: '2026-09-20T11:45:00Z' },
];

export default function AdminUsers({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<UserData[]>(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');

  // Simula buscar usuários do supabase (remover o MOCK quando tiver a tabela certa)
  /*
  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase.from('profiles').select('*');
      if (data) setUsers(data);
    }
    loadUsers();
  }, []);
  */

  const handlePromote = (id: string, currentRole: string) => {
    // Apenas Admins podem promover
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'master') {
      alert('Você não tem permissão para alterar regras de acesso.');
      return;
    }
    
    setUsers(users.map(u => {
      if (u.id === id) {
        const newRole = currentRole === 'admin' ? 'operator' : 'admin';
        return { ...u, role: newRole as any };
      }
      return u;
    }));
    // TODO: update supabase
  };

  const handleDelete = (id: string) => {
    if(window.confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsers(users.filter(u => u.id !== id));
      // TODO: delete from supabase
    }
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              borderRadius: '8px',
              border: '1px solid #334155',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              outline: 'none'
            }}
          />
        </div>
        <button className="admin-btn primary">
          <UserPlus size={18} />
          Adicionar Usuário
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Permissão</th>
              <th>Data de Cadastro</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.name}</td>
                <td style={{ color: '#94a3b8' }}>{user.email}</td>
                <td>
                  <span className={`badge ${user.role}`}>
                    {user.role === 'admin' ? 'Administrador' : user.role === 'operator' ? 'Operador' : 'Usuário'}
                  </span>
                </td>
                <td style={{ color: '#94a3b8' }}>
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      className="admin-btn outline" 
                      style={{ padding: '6px' }}
                      title={user.role === 'admin' ? "Rebaixar para Operador" : "Promover a Admin"}
                      onClick={() => handlePromote(user.id, user.role)}
                    >
                      {user.role === 'admin' ? <ShieldOff size={16} /> : <Shield size={16} />}
                    </button>
                    <button className="admin-btn outline" style={{ padding: '6px' }} title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button 
                      className="admin-btn danger" 
                      style={{ padding: '6px' }} 
                      title="Excluir"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
