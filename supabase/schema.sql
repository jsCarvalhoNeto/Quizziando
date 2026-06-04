-- Habilitar a extensão UUID se não estiver ativa
create extension if not exists "uuid-ossp";

-- 1. TABELA PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text not null,
  role text not null check (role in ('operator', 'player')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS em profiles
alter table public.profiles enable row level security;

create policy "Permitir leitura pública de perfis" 
  on public.profiles for select using (true);

create policy "Permitir inserção pelo próprio usuário" 
  on public.profiles for insert with check (auth.uid() = id);

create policy "Permitir atualização pelo próprio usuário" 
  on public.profiles for update using (auth.uid() = id);

-- 2. TABELA CATEGORIES
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text not null default '#7C3AED', -- Cor padrão (Violeta)
  icon text not null default 'HelpCircle', -- Ícone padrão Lucide
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS em categories
alter table public.categories enable row level security;

create policy "Permitir leitura pública de categorias" 
  on public.categories for select using (true);

create policy "Permitir que operadores gerenciem suas categorias" 
  on public.categories for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'operator'
    )
  );

-- Trigger para limitar a 20 categorias por operador
create or replace function public.check_categories_limit()
returns trigger as $$
declare
  category_count integer;
begin
  select count(*) into category_count 
  from public.categories 
  where created_by = new.created_by;
  
  if category_count >= 20 then
    raise exception 'Um operador pode cadastrar no máximo 20 categorias.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_categories_limit
  before insert on public.categories
  for each row execute function public.check_categories_limit();

-- 3. TABELA QUESTIONS
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.categories(id) on delete cascade not null,
  question_text text not null,
  time_limit integer not null default 20,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.questions enable row level security;

create policy "Permitir leitura pública de perguntas" 
  on public.questions for select using (true);

create policy "Permitir que operadores gerenciem perguntas" 
  on public.questions for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'operator'
    )
  );

-- 4. TABELA ALTERNATIVES
create table public.alternatives (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  alternative_text text not null,
  is_correct boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.alternatives enable row level security;

create policy "Permitir leitura pública de alternativas" 
  on public.alternatives for select using (true);

create policy "Permitir que operadores gerenciem alternativas" 
  on public.alternatives for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'operator'
    )
  );

-- 5. TABELA GAMES (Salas de Jogos)
create table public.games (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  status text not null check (status in ('waiting', 'playing', 'finished')) default 'waiting',
  mode text not null check (mode in ('duel', 'team', 'open')),
  rounds_total integer not null default 5,
  current_round integer not null default 0,
  time_limit integer not null default 15, -- Tempo padrão da pergunta em segundos
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.games enable row level security;

create policy "Permitir leitura pública de jogos" 
  on public.games for select using (true);

create policy "Permitir que operadores gerenciem seus jogos" 
  on public.games for all using (auth.uid() = host_id);

-- 6. TABELA GAME_PLAYERS
create table public.game_players (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_name text, -- Usado no modo time
  score integer not null default 0,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (game_id, user_id)
);

alter table public.game_players enable row level security;

create policy "Permitir leitura pública de jogadores da partida" 
  on public.game_players for select using (true);

create policy "Permitir que qualquer jogador se registre no lobby" 
  on public.game_players for all using (true);

-- Ativar Publicação em Tempo Real (Realtime) para as tabelas essenciais
begin;
  -- Remover tabelas existentes da publicação se houver
  drop publication if exists supabase_realtime;
  
  -- Criar nova publicação
  create publication supabase_realtime for table public.games, public.game_players;
commit;
