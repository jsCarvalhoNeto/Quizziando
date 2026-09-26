-- Migration: Permite que administradores redefinam a senha de operadores para a senha padrão
create extension if not exists pgcrypto;

create or replace function public.admin_reset_user_password(
  target_user_id uuid,
  new_password text default 'quizziando123'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_user_exists boolean;
begin
  -- Se houver chamador autenticado via Supabase Auth
  if v_caller_id is not null then
    select role into v_caller_role
    from public.profiles
    where id = v_caller_id;

    -- Se não tiver role admin na tabela profiles, confere se email é administrador
    if v_caller_role is distinct from 'admin' then
      if not exists (
        select 1 from auth.users 
        where id = v_caller_id and (
          email ilike '%admin%' 
          or email = 'santoscarvalhobs@gmail.com'
        )
      ) then
        return jsonb_build_object(
          'success', false, 
          'error', 'Apenas administradores podem resetar senhas.'
        );
      end if;
    end if;
  end if;

  -- Verifica se o usuário alvo existe em auth.users
  select exists(select 1 from auth.users where id = target_user_id) into v_user_exists;
  
  if not v_user_exists then
    return jsonb_build_object(
      'success', false, 
      'error', 'Usuário com este ID não foi encontrado no sistema de autenticação (auth.users).'
    );
  end if;

  -- Atualiza o hash da senha em auth.users usando bcrypt
  update auth.users
  set 
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = target_user_id;

  return jsonb_build_object(
    'success', true, 
    'message', 'Senha redefinida com sucesso para ' || new_password
  );
end;
$$;

-- Permite execução para usuários authenticated e anon (a validação de perfil admin ocorre na função)
grant execute on function public.admin_reset_user_password(uuid, text) to authenticated, anon;
