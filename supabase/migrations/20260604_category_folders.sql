-- Criar a tabela de pastas de categorias
create table public.category_folders (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text not null default '#7C3AED',
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS em category_folders
alter table public.category_folders enable row level security;

create policy "Permitir leitura pública de pastas de categorias" 
  on public.category_folders for select using (true);

create policy "Permitir que operadores gerenciem suas pastas" 
  on public.category_folders for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'operator'
    )
  );

-- Adicionar a referência na tabela de categorias
alter table public.categories add column folder_id uuid references public.category_folders(id) on delete set null;
