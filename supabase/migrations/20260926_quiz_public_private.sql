-- ==============================================================================
-- Migration: Suporte a Modo de Visibilidade de Quizzes (Público vs Privado)
-- Quizzes públicos ficam visíveis e jogáveis por todos os operadores cadastrados.
-- Quizzes privados ficam restritos ao operador que os criou.
-- Data: 2026-09-26
-- ==============================================================================

-- 1. Adicionar coluna 'is_public' na tabela public.categories (padrão: false / privado)
alter table public.categories add column if not exists is_public boolean not null default false;

-- 2. Criar índice para consultas rápidas por visibilidade e criador
create index if not exists idx_categories_is_public on public.categories (is_public);
create index if not exists idx_categories_created_by on public.categories (created_by);

-- 3. Atualizar Políticas de Segurança RLS em public.categories
-- Permite leitura de categorias públicas por qualquer autenticado ou privadas criadas pelo próprio usuário
drop policy if exists own_categories on public.categories;
drop policy if exists categories_read on public.categories;
drop policy if exists categories_insert on public.categories;
drop policy if exists categories_update on public.categories;
drop policy if exists categories_delete on public.categories;

-- Leitura: Criador ou Quizzes Marcados como Públicos
create policy categories_read on public.categories for select to authenticated
  using (created_by = auth.uid() or is_public = true);

-- Inserção: Usuário autenticado define a si mesmo como criador
create policy categories_insert on public.categories for insert to authenticated
  with check (created_by = auth.uid() and
    (folder_id is null or exists(select 1 from public.category_folders f where f.id = folder_id and f.created_by = auth.uid())));

-- Atualização: Apenas o criador pode alterar seus quizzes (incluindo alternar público/privado)
create policy categories_update on public.categories for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid() and
    (folder_id is null or exists(select 1 from public.category_folders f where f.id = folder_id and f.created_by = auth.uid())));

-- Exclusão: Apenas o criador pode excluir seu quiz
create policy categories_delete on public.categories for delete to authenticated
  using (created_by = auth.uid());

-- 4. Atualizar Políticas de Segurança RLS em public.questions
drop policy if exists own_questions on public.questions;
drop policy if exists questions_read on public.questions;
drop policy if exists questions_insert on public.questions;
drop policy if exists questions_update on public.questions;
drop policy if exists questions_delete on public.questions;

-- Leitura: Qualquer operador pode ler perguntas de quizzes públicos ou de sua autoria
create policy questions_read on public.questions for select to authenticated
  using (exists(select 1 from public.categories c where c.id = category_id and (c.created_by = auth.uid() or c.is_public = true)));

-- Edição / Inserção / Exclusão: Somente o criador do quiz correspondente pode gerenciar as perguntas
create policy questions_insert on public.questions for insert to authenticated
  with check (exists(select 1 from public.categories c where c.id = category_id and c.created_by = auth.uid()));

create policy questions_update on public.questions for update to authenticated
  using (exists(select 1 from public.categories c where c.id = category_id and c.created_by = auth.uid()))
  with check (exists(select 1 from public.categories c where c.id = category_id and c.created_by = auth.uid()));

create policy questions_delete on public.questions for delete to authenticated
  using (exists(select 1 from public.categories c where c.id = category_id and c.created_by = auth.uid()));

-- 5. Atualizar Políticas de Segurança RLS em public.alternatives
drop policy if exists own_alternatives on public.alternatives;
drop policy if exists alternatives_read on public.alternatives;
drop policy if exists alternatives_insert on public.alternatives;
drop policy if exists alternatives_update on public.alternatives;
drop policy if exists alternatives_delete on public.alternatives;

-- Leitura: Qualquer operador pode ler alternativas de quizzes públicos ou próprios
create policy alternatives_read on public.alternatives for select to authenticated
  using (exists(
    select 1 from public.questions q 
    join public.categories c on c.id = q.category_id
    where q.id = question_id and (c.created_by = auth.uid() or c.is_public = true)
  ));

-- Edição / Inserção / Exclusão: Somente o proprietário da categoria
create policy alternatives_insert on public.alternatives for insert to authenticated
  with check (exists(
    select 1 from public.questions q 
    join public.categories c on c.id = q.category_id
    where q.id = question_id and c.created_by = auth.uid()
  ));

create policy alternatives_update on public.alternatives for update to authenticated
  using (exists(
    select 1 from public.questions q 
    join public.categories c on c.id = q.category_id
    where q.id = question_id and c.created_by = auth.uid()
  ))
  with check (exists(
    select 1 from public.questions q 
    join public.categories c on c.id = q.category_id
    where q.id = question_id and c.created_by = auth.uid()
  ));

create policy alternatives_delete on public.alternatives for delete to authenticated
  using (exists(
    select 1 from public.questions q 
    join public.categories c on c.id = q.category_id
    where q.id = question_id and c.created_by = auth.uid()
  ));

-- 6. Atualizar a função RPC quiz_create_room para permitir criar salas com quizzes públicos
create or replace function public.quiz_create_room(
  p_request_id uuid, 
  p_mode text, 
  p_rounds integer, 
  p_time_limit integer, 
  p_category_ids uuid[]
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare 
  v_room public.game_rooms; 
  v_cats jsonb; 
  v_count integer; 
  v_code text;
begin
  if auth.uid() is null then raise exception 'Entre como organizador para criar uma sala.'; end if;
  select * into v_room from public.game_rooms where id = p_request_id and host_id = auth.uid();
  if found then return to_jsonb(v_room); end if;
  if p_mode is null or p_mode not in ('open','team','duel') or p_rounds is null or p_rounds not between 1 and 100
    or p_time_limit is null or p_time_limit not between 5 and 600 then raise exception 'Configuração de partida inválida.'; end if;
  
  -- Permite categorias que pertençam ao host OU sejam públicas
  select jsonb_agg(jsonb_build_object('id',id,'name',name,'color',color,'icon',icon) order by name), count(*)
    into v_cats, v_count from public.categories 
    where id = any(p_category_ids) and (created_by = auth.uid() or is_public = true);
    
  if v_count = 0 or v_count <> cardinality(p_category_ids) then 
    raise exception 'Selecione categorias válidas do seu acervo ou do acervo público.'; 
  end if;

  if (select count(*) from public.questions where category_id = any(p_category_ids)) < p_rounds then 
    raise exception 'Não há perguntas suficientes para jogar sem repetição. Reduza as rodadas.'; 
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    begin
      insert into public.game_rooms(id,code,host_id,game_mode,rounds,time_limit,categories)
        values(p_request_id,v_code,auth.uid(),p_mode,p_rounds,p_time_limit,v_cats) returning * into v_room;
      exit;
    exception when unique_violation then null;
    end;
  end loop;

  return to_jsonb(v_room);
end;
$$;

-- 7. Função RPC específica para alternar privacidade de forma rápida e segura
create or replace function public.toggle_quiz_privacy(p_category_id uuid, p_is_public boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean := false;
begin
  if auth.uid() is null then 
    raise exception 'Apenas usuários autenticados podem alterar a visibilidade do quiz.'; 
  end if;

  update public.categories
  set is_public = p_is_public
  where id = p_category_id and (
    created_by = auth.uid() 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

  v_updated := found;
  if not v_updated then
    raise exception 'Quiz não encontrado ou você não tem permissão para alterar este quiz.';
  end if;

  return v_updated;
end;
$$;

grant execute on function public.toggle_quiz_privacy(uuid, boolean) to authenticated;
