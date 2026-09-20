import { readFile } from 'node:fs/promises';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const project = process.env.SUPABASE_PROJECT_REF || 'nttbpmnnzrrhijobinui';
if (!token) {
  console.error('Defina SUPABASE_ACCESS_TOKEN para executar os testes do banco.');
  process.exit(1);
}

const query = await readFile(new URL('./server-gameplay.sql', import.meta.url), 'utf8');
const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});
if (!response.ok) {
  console.error(`Testes do banco falharam (${response.status}): ${await response.text()}`);
  process.exit(1);
}
console.log('Testes transacionais do banco passaram. Nenhum dado de teste foi preservado.');
