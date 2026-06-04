-- Adiciona a coluna time_limit à tabela questions
ALTER TABLE public.questions ADD COLUMN time_limit integer not null default 20;
