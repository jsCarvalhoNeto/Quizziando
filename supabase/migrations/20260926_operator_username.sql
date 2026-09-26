-- ==============================================================================
-- Migration: Suporte a Nome de Usuário Único (@username) para Operadores / Educadores
-- Data: 2026-09-26
-- ==============================================================================

-- 1. Adicionar colunas 'username' e 'email' na tabela public.profiles caso ainda não existam
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists email text;

-- 2. Atualizar usuários já criados com a inicial do e-mail antes do '@' como nome de usuário
-- Obtém o e-mail diretamente da tabela de autenticação auth.users
update public.profiles p
set 
  email = coalesce(p.email, u.email),
  username = coalesce(
    nullif(trim(p.username), ''),
    lower(split_part(u.email, '@', 1))
  ),
  nickname = coalesce(
    nullif(trim(p.nickname), ''),
    lower(split_part(u.email, '@', 1))
  )
from auth.users u
where p.id = u.id;

-- 3. Tratamento de unicidade para registros existentes caso haja nomes de usuário duplicados
do $$
declare
  r record;
  counter int;
  candidate text;
begin
  for r in (
    select id, username, row_number() over (partition by lower(username) order by created_at) as rn
    from public.profiles
    where username is not null and username <> ''
  ) loop
    if r.rn > 1 then
      counter := r.rn;
      candidate := r.username || '_' || counter;
      while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
        counter := counter + 1;
        candidate := r.username || '_' || counter;
      end loop;
      update public.profiles set username = candidate where id = r.id;
    end if;
  end loop;
end;
$$;

-- 4. Criar índice e constraint de unicidade para o username
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_unique'
  ) then
    alter table public.profiles add constraint profiles_username_unique unique (username);
  end if;
end;
$$;

create index if not exists idx_profiles_username_lower on public.profiles (lower(username));

-- 5. Trigger em auth.users para sincronizar automaticamente novos cadastros com 'username'
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_raw_username text;
  v_final_username text;
  v_nickname text;
  v_counter int := 1;
begin
  -- Recupera o username dos metadados ou extrai do e-mail
  v_raw_username := lower(trim(coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  )));

  -- Remove caracteres inválidos (mantém a-z, 0-9 e _)
  v_raw_username := regexp_replace(v_raw_username, '[^a-z0-9_]', '', 'g');
  if v_raw_username = '' or v_raw_username is null then
    v_raw_username := 'prof_' || substr(new.id::text, 1, 6);
  end if;

  v_final_username := v_raw_username;
  while exists (select 1 from public.profiles where lower(username) = lower(v_final_username) and id <> new.id) loop
    v_counter := v_counter + 1;
    v_final_username := v_raw_username || '_' || v_counter;
  end loop;

  v_nickname := coalesce(new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'name', v_final_username);

  insert into public.profiles (id, nickname, username, email, role, created_at)
  values (
    new.id,
    v_nickname,
    v_final_username,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'operator'),
    now()
  )
  on conflict (id) do update
  set
    username = coalesce(profiles.username, excluded.username),
    email = coalesce(profiles.email, excluded.email),
    nickname = coalesce(profiles.nickname, excluded.nickname);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- 6. Função RPC para buscar e-mail de login a partir do username (permite login com @usuario ou email)
create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_clean text;
begin
  v_clean := lower(trim(replace(p_username, '@', '')));
  select coalesce(p.email, u.email) into v_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where lower(p.username) = v_clean
  limit 1;

  return v_email;
end;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- 7. Função RPC para checagem rápida de disponibilidade de username em tempo real
create or replace function public.check_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
begin
  v_clean := lower(trim(replace(p_username, '@', '')));
  if length(v_clean) < 3 then
    return false;
  end if;
  return not exists (
    select 1 from public.profiles
    where lower(username) = v_clean
  );
end;
$$;

grant execute on function public.check_username_available(text) to anon, authenticated;
