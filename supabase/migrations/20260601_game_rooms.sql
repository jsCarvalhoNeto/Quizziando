-- ============================================================
-- Quizziando — Sistema de Salas com Código de Acesso
-- ============================================================

-- Tabela de salas de jogo
CREATE TABLE IF NOT EXISTS game_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,         -- ex: "XK9F"
  operator_email  TEXT,
  game_mode       TEXT DEFAULT 'open',
  rounds          INTEGER DEFAULT 3,
  time_limit      INTEGER DEFAULT 15,
  status          TEXT DEFAULT 'lobby',         -- 'lobby' | 'playing' | 'finished'
  round_state     TEXT DEFAULT 'idle',          -- 'idle' | 'spinning' | 'category-reveal' | 'question' | 'answered' | 'ranking'
  current_round   INTEGER DEFAULT 1,
  current_question JSONB DEFAULT NULL,          -- JSON da pergunta ativa
  selected_category JSONB DEFAULT NULL,         -- categoria sorteada
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Tabela de jogadores na sala
CREATE TABLE IF NOT EXISTS room_players (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code       TEXT NOT NULL,
  nickname        TEXT NOT NULL,
  score           INTEGER DEFAULT 0,
  joined_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_code, nickname)
);

-- Tabela de respostas dos jogadores
CREATE TABLE IF NOT EXISTS player_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code       TEXT NOT NULL,
  player_nickname TEXT NOT NULL,
  round_index     INTEGER NOT NULL,
  answer_index    INTEGER NOT NULL,             -- 0=A(vermelho), 1=B(azul), 2=C(amarelo), 3=D(verde)
  is_correct      BOOLEAN,
  points_earned   INTEGER DEFAULT 0,
  answered_at     TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(code);
CREATE INDEX IF NOT EXISTS idx_room_players_room_code ON room_players(room_code);
CREATE INDEX IF NOT EXISTS idx_player_answers_room_round ON player_answers(room_code, round_index);

-- RLS (Row Level Security) — Permissão pública de leitura/escrita para o demo
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ler salas" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Todos podem criar/atualizar salas" ON game_rooms FOR ALL USING (true);

CREATE POLICY "Todos podem ler jogadores" ON room_players FOR SELECT USING (true);
CREATE POLICY "Todos podem entrar em salas" ON room_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos podem atualizar score" ON room_players FOR UPDATE USING (true);

CREATE POLICY "Todos podem ler respostas" ON player_answers FOR SELECT USING (true);
CREATE POLICY "Todos podem enviar respostas" ON player_answers FOR INSERT WITH CHECK (true);

-- Habilitar Realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE player_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
