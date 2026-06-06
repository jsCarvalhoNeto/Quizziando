// localDb.ts — Banco de dados local SQLite via sql.js (WebAssembly)
// Persiste categorias e questões localmente, sem necessidade de internet.

import type { SqlJsStatic, Database } from 'sql.js';

export interface LocalCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface LocalAlternative {
  text: string;
  isCorrect: boolean;
}

export interface LocalQuestion {
  id: string;
  category_id: string;
  question_text: string;
  time_limit: number;
  alternatives: LocalAlternative[];
}

const STORAGE_KEY = 'quizziando_local_db';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

// ─── Inicialização ───────────────────────────────────────────────────────────

async function getSqlJs(): Promise<SqlJsStatic> {
  if (SQL) return SQL;

  // sql.js pode exportar de formas diferentes dependendo do bundler
  // Tentamos múltiplas abordagens até encontrar a correta
  let initFn: ((config?: any) => Promise<SqlJsStatic>) | null = null;

  try {
    const mod = await import('sql.js');
    // Tentativa 1: export default é a função diretamente
    if (typeof mod.default === 'function') {
      initFn = mod.default as any;
    }
    // Tentativa 2: export default tem campo default (duplo wrap CJS)
    else if (mod.default && typeof (mod.default as any).default === 'function') {
      initFn = (mod.default as any).default;
    }
    // Tentativa 3: export nomeado
    else if (typeof (mod as any).initSqlJs === 'function') {
      initFn = (mod as any).initSqlJs;
    }
    // Tentativa 4: window global (fallback CDN)
    else if (typeof (window as any).initSqlJs === 'function') {
      initFn = (window as any).initSqlJs;
    }
  } catch (e) {
    console.warn('[localDb] Erro ao importar sql.js:', e);
  }

  if (!initFn) {
    throw new Error(
      'sql.js não pôde ser inicializado. Verifique se o arquivo sql-wasm.wasm está em /public.'
    );
  }

  SQL = await initFn({
    locateFile: (file: string) => `/${file}`,
  });
  return SQL!;
}


function createSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#7C3AED',
      icon TEXT NOT NULL DEFAULT 'HelpCircle'
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      time_limit INTEGER NOT NULL DEFAULT 20,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alternatives (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      alternative_text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
  `);
}

function saveDb(database: Database) {
  const data = database.export();
  const base64 = btoa(String.fromCharCode(...data));
  localStorage.setItem(STORAGE_KEY, base64);
}

function loadDb(sqlJs: SqlJsStatic): Database {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const binary = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
      return new sqlJs.Database(binary);
    } catch {
      // banco corrompido — criar um novo
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return new sqlJs.Database();
}

// ─── API Pública ─────────────────────────────────────────────────────────────

export async function initDb(): Promise<void> {
  if (db) return;
  const sqlJs = await getSqlJs();
  db = loadDb(sqlJs);
  createSchema(db);
  // Persistir schema imediatamente
  saveDb(db);
}

function getDb(): Database {
  if (!db) throw new Error('Banco local não inicializado. Chame initDb() primeiro.');
  return db;
}

// ─── Categorias ──────────────────────────────────────────────────────────────

export function getLocalCategories(): LocalCategory[] {
  const database = getDb();
  const result = database.exec('SELECT id, name, color, icon FROM categories ORDER BY name');
  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0] as string,
    name: row[1] as string,
    color: row[2] as string,
    icon: row[3] as string,
  }));
}

export function insertLocalCategory(cat: Omit<LocalCategory, 'id'>): LocalCategory {
  const database = getDb();
  const id = crypto.randomUUID();
  database.run(
    'INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
    [id, cat.name, cat.color, cat.icon]
  );
  saveDb(database);
  return { id, ...cat };
}

export function deleteLocalCategory(id: string): void {
  const database = getDb();
  database.run('DELETE FROM alternatives WHERE question_id IN (SELECT id FROM questions WHERE category_id = ?)', [id]);
  database.run('DELETE FROM questions WHERE category_id = ?', [id]);
  database.run('DELETE FROM categories WHERE id = ?', [id]);
  saveDb(database);
}

// ─── Questões ────────────────────────────────────────────────────────────────

export function getLocalQuestions(categoryId?: string): LocalQuestion[] {
  const database = getDb();
  let qRows;
  if (categoryId) {
    qRows = database.exec(
      'SELECT id, category_id, question_text, time_limit FROM questions WHERE category_id = ? ORDER BY rowid',
      [categoryId]
    );
  } else {
    qRows = database.exec(
      'SELECT id, category_id, question_text, time_limit FROM questions ORDER BY rowid'
    );
  }

  if (!qRows.length) return [];

  return qRows[0].values.map(row => {
    const qId = row[0] as string;
    const altRows = database.exec(
      'SELECT alternative_text, is_correct FROM alternatives WHERE question_id = ? ORDER BY rowid',
      [qId]
    );
    const alternatives: LocalAlternative[] = altRows.length
      ? altRows[0].values.map(a => ({
          text: a[0] as string,
          isCorrect: (a[1] as number) === 1,
        }))
      : [];

    return {
      id: qId,
      category_id: row[1] as string,
      question_text: row[2] as string,
      time_limit: row[3] as number,
      alternatives,
    };
  });
}

export function insertLocalQuestion(
  q: Omit<LocalQuestion, 'id'>
): LocalQuestion {
  const database = getDb();
  const id = crypto.randomUUID();
  database.run(
    'INSERT INTO questions (id, category_id, question_text, time_limit) VALUES (?, ?, ?, ?)',
    [id, q.category_id, q.question_text, q.time_limit]
  );
  for (const alt of q.alternatives) {
    const altId = crypto.randomUUID();
    database.run(
      'INSERT INTO alternatives (id, question_id, alternative_text, is_correct) VALUES (?, ?, ?, ?)',
      [altId, id, alt.text, alt.isCorrect ? 1 : 0]
    );
  }
  saveDb(database);
  return { id, ...q };
}

export function deleteLocalQuestion(id: string): void {
  const database = getDb();
  database.run('DELETE FROM alternatives WHERE question_id = ?', [id]);
  database.run('DELETE FROM questions WHERE id = ?', [id]);
  saveDb(database);
}

// ─── Importação do Supabase ───────────────────────────────────────────────────

/**
 * Importa categorias e questões do Supabase para o banco local (SQLite).
 * Útil para sincronizar ao abrir o app com internet disponível.
 */
export function importFromSupabaseData(
  categories: LocalCategory[],
  questions: LocalQuestion[]
): void {
  const database = getDb();

  // Limpar tabelas e recriar
  database.run('DELETE FROM alternatives');
  database.run('DELETE FROM questions');
  database.run('DELETE FROM categories');

  for (const cat of categories) {
    database.run(
      'INSERT OR REPLACE INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
      [cat.id, cat.name, cat.color, cat.icon]
    );
  }

  for (const q of questions) {
    database.run(
      'INSERT OR REPLACE INTO questions (id, category_id, question_text, time_limit) VALUES (?, ?, ?, ?)',
      [q.id, q.category_id, q.question_text, q.time_limit]
    );
    for (const alt of q.alternatives) {
      const altId = crypto.randomUUID();
      database.run(
        'INSERT INTO alternatives (id, question_id, alternative_text, is_correct) VALUES (?, ?, ?, ?)',
        [altId, q.id, alt.text, alt.isCorrect ? 1 : 0]
      );
    }
  }

  saveDb(database);
}

export function hasLocalData(): boolean {
  try {
    const database = getDb();
    const result = database.exec('SELECT COUNT(*) as cnt FROM questions');
    const count = result[0]?.values[0]?.[0] as number ?? 0;
    return count > 0;
  } catch {
    return false;
  }
}
