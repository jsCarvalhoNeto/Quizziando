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
  explanation?: string | null;
  reference_url?: string | null;
  alternatives: LocalAlternative[];
}

const STORAGE_KEY = 'quizziando_local_db';
const BACKUP_STORAGE_KEY = 'quizziando_local_db_backup';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

// ─── Inicialização ───────────────────────────────────────────────────────────

async function getSqlJs(): Promise<SqlJsStatic> {
  if (SQL) return SQL;

  try {
    let initFn: any = undefined;
    if (typeof (window as any).initSqlJs === 'function') {
      initFn = (window as any).initSqlJs;
    }

    if (!initFn) throw new Error('Função initSqlJs não encontrada no window. Verifique se o script sql-wasm.js está no index.html.');

    SQL = await initFn({
      locateFile: (file: string) => `/${file}`,
    });
    return SQL as SqlJsStatic;
  } catch (e) {
    console.error('[localDb] Erro fatal ao carregar sql.js:', e);
    throw new Error('sql.js não pôde ser inicializado. ' + (e as Error).message);
  }
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
      explanation TEXT,
      reference_url TEXT,
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
  const columns = database.exec('PRAGMA table_info(questions)')[0]?.values.map(row => String(row[1])) || [];
  if (!columns.includes('explanation')) database.run('ALTER TABLE questions ADD COLUMN explanation TEXT');
  if (!columns.includes('reference_url')) database.run('ALTER TABLE questions ADD COLUMN reference_url TEXT');
}

function saveDb(database: Database) {
  const data = database.export();
  let binary = '';
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const base64 = window.btoa(binary);
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
      'SELECT id, category_id, question_text, time_limit, explanation, reference_url FROM questions WHERE category_id = ? ORDER BY rowid',
      [categoryId]
    );
  } else {
    qRows = database.exec(
      'SELECT id, category_id, question_text, time_limit, explanation, reference_url FROM questions ORDER BY rowid'
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
      explanation: row[4] as string | null,
      reference_url: row[5] as string | null,
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
    'INSERT INTO questions (id, category_id, question_text, time_limit, explanation, reference_url) VALUES (?, ?, ?, ?, ?, ?)',
    [id, q.category_id, q.question_text, q.time_limit, q.explanation || null, q.reference_url || null]
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
  validateImport(categories, questions);
  createBackup();
  database.run('BEGIN');
  try {
    database.run('DELETE FROM alternatives');
    database.run('DELETE FROM questions');
    database.run('DELETE FROM categories');
    writeImportedData(database, categories, questions);
    database.run('COMMIT');
    saveDb(database);
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }
}

/** Returns whether a restore point exists from the last full replacement. */
export function hasLocalBackup(): boolean {
  return Boolean(localStorage.getItem(BACKUP_STORAGE_KEY));
}

/** Restores the database that existed immediately before the last replacement. */
export function restoreLocalBackup(): void {
  const backup = localStorage.getItem(BACKUP_STORAGE_KEY);
  if (!backup || !SQL) throw new Error('Nenhum backup local está disponível.');
  try {
    const binary = Uint8Array.from(atob(backup), character => character.charCodeAt(0));
    const restored = new SQL.Database(binary);
    // Confirma que o conteúdo é realmente um banco do Quizziando antes de trocar
    // a instância atualmente em uso.
    restored.exec('SELECT id, name FROM categories LIMIT 1');
    createSchema(restored);
    db?.close();
    db = restored;
    saveDb(restored);
  } catch {
    throw new Error('O backup local está inválido e não pôde ser restaurado.');
  }
}

function createBackup(): void {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) localStorage.setItem(BACKUP_STORAGE_KEY, current);
}

/**
 * Atualiza somente os itens recebidos da nuvem. Conteúdo local que não veio no
 * download permanece intacto; é a opção indicada para sincronização cotidiana.
 */
export function mergeFromSupabaseData(categories: LocalCategory[], questions: LocalQuestion[]): void {
  const database = getDb();
  validateImport(categories, questions);
  database.run('BEGIN');
  try {
    writeImportedData(database, categories, questions, true);
    database.run('COMMIT');
    saveDb(database);
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }
}

function validateImport(categories: LocalCategory[], questions: LocalQuestion[]): void {
  const categoryIds = new Set(categories.map(category => category.id));
  if (categoryIds.size !== categories.length || categories.some(category => !category.id || !category.name.trim())) {
    throw new Error('As categorias recebidas são inválidas. Nada foi alterado.');
  }
  if (questions.some(question =>
    !question.id || !categoryIds.has(question.category_id) || !question.question_text.trim() ||
    question.time_limit < 5 || question.alternatives.length !== 4 ||
    question.alternatives.filter(alternative => alternative.isCorrect).length !== 1 ||
    question.alternatives.some(alternative => !alternative.text.trim())
  )) {
    throw new Error('Há uma pergunta inválida na sincronização. Nada foi alterado.');
  }
}

function writeImportedData(
  database: Database,
  categories: LocalCategory[],
  questions: LocalQuestion[],
  preserveUnreceived = false,
): void {
  for (const category of categories) {
    database.run(
      'INSERT OR REPLACE INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
      [category.id, category.name, category.color, category.icon],
    );
  }
  for (const question of questions) {
    if (preserveUnreceived) {
      database.run('DELETE FROM alternatives WHERE question_id = ?', [question.id]);
    }
    database.run(
      'INSERT OR REPLACE INTO questions (id, category_id, question_text, time_limit, explanation, reference_url) VALUES (?, ?, ?, ?, ?, ?)',
      [question.id, question.category_id, question.question_text, question.time_limit, question.explanation || null, question.reference_url || null],
    );
    for (const alternative of question.alternatives) {
      database.run(
        'INSERT INTO alternatives (id, question_id, alternative_text, is_correct) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), question.id, alternative.text, alternative.isCorrect ? 1 : 0],
      );
    }
  }
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
