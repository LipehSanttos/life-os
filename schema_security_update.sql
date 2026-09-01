-- ==============================================================================
-- LIFE OS - ATUALIZAÇÕES DE SEGURANÇA E CONSISTÊNCIA DO SCHEMA (APLIQUE NO SQL EDITOR)
-- ==============================================================================
-- Execute este script no SQL Editor do Supabase para aplicar todas as correções de
-- segurança e consistência identificadas na auditoria.
-- ATENÇÃO: Este script é incremental — NÃO recria tabelas existentes.
-- ==============================================================================

-- =========================================
-- 1. CORRIGIR USUARIO RODRIGO COM ID ERRADO
-- =========================================
-- O Rodrigo foi inserido com id='Rodrigo' (texto) em vez do UUID do Supabase Auth.
-- Vamos corrigir isso: delete o registro antigo e um novo será criado pelo trigger.

-- Antes: salvar dados existentes
DO $$
DECLARE
  rodrigo_auth_id TEXT := '26cb6391-3aea-4830-8c51-937ffcdd4447';
  rodrigo_email TEXT := 'keittonyr@gmail.com';
BEGIN
  -- Deletar o registro antigo com ID errado
  DELETE FROM public."User" WHERE id = 'Rodrigo' AND email = rodrigo_email;

  -- Inserir com o ID correto do Supabase Auth
  INSERT INTO public."User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
  VALUES (
    rodrigo_auth_id,
    'Rodrigo',
    rodrigo_email,
    'managed_by_supabase_auth',
    'USER',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    "updatedAt" = NOW();

  -- Criar UserSettings para o Rodrigo
  INSERT INTO public."UserSettings" (id, name, email, theme, "createdAt", "updatedAt")
  VALUES (rodrigo_auth_id, 'Rodrigo', rodrigo_email, 'dark', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Rodrigo corrigido com UUID correto: %', rodrigo_auth_id;
END $$;

-- =========================================
-- 2. ADICIONAR CAMPO userId EM ActivityLog
-- =========================================
ALTER TABLE public."ActivityLog"
  ADD COLUMN IF NOT EXISTS "userId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL;

-- =========================================
-- 3. ADICIONAR CHECK CONSTRAINTS DE ROLE
-- =========================================
-- Previne roles inválidas no banco
DO $$ BEGIN
  ALTER TABLE public."User"
    ADD CONSTRAINT "User_role_check" CHECK ("role" IN ('USER', 'ADMIN'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- 4. ADICIONAR ÍNDICES DE PERFORMANCE
-- =========================================
-- Task
CREATE INDEX IF NOT EXISTS "Task_userId_idx"      ON public."Task"("userId");
CREATE INDEX IF NOT EXISTS "Task_status_idx"       ON public."Task"("status");
CREATE INDEX IF NOT EXISTS "Task_dueDate_idx"      ON public."Task"("dueDate");
CREATE INDEX IF NOT EXISTS "Task_categoryId_idx"   ON public."Task"("categoryId");

-- FinancialReminder
CREATE INDEX IF NOT EXISTS "FinancialReminder_userId_idx"  ON public."FinancialReminder"("userId");
CREATE INDEX IF NOT EXISTS "FinancialReminder_dueDate_idx" ON public."FinancialReminder"("dueDate");
CREATE INDEX IF NOT EXISTS "FinancialReminder_status_idx"  ON public."FinancialReminder"("status");

-- Project / Course / Book
CREATE INDEX IF NOT EXISTS "Project_userId_idx"  ON public."Project"("userId");
CREATE INDEX IF NOT EXISTS "Course_userId_idx"   ON public."Course"("userId");
CREATE INDEX IF NOT EXISTS "Book_userId_idx"     ON public."Book"("userId");

-- ChatSession / ChatMessage / Subtask
CREATE INDEX IF NOT EXISTS "ChatSession_userId_idx"    ON public."ChatSession"("userId");
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_idx" ON public."ChatMessage"("sessionId");
CREATE INDEX IF NOT EXISTS "Subtask_taskId_idx"        ON public."Subtask"("taskId");

-- ActivityLog
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx"    ON public."ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_entityId_idx"  ON public."ActivityLog"("entityId");

-- =========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =========================================
-- Habilitar RLS em todas as tabelas de dados do usuário
ALTER TABLE public."User"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserSettings"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Task"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subtask"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Project"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Course"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Book"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinancialReminder"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChatSession"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChatMessage"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ActivityLog"         ENABLE ROW LEVEL SECURITY;
-- Category é global — sem RLS de usuário (apenas autenticação)
ALTER TABLE public."Category"            ENABLE ROW LEVEL SECURITY;

-- Políticas: service_role ignora RLS (backend tem acesso total)
-- Política para anon/authenticated via REST público (bloquear leitura direta)

-- Category: qualquer usuário autenticado pode ler; apenas service_role pode escrever
CREATE POLICY IF NOT EXISTS "Category_select_authenticated"
  ON public."Category" FOR SELECT
  TO authenticated
  USING (true);

-- User: cada usuário vê apenas seu próprio registro via JWT
CREATE POLICY IF NOT EXISTS "User_select_own"
  ON public."User" FOR SELECT
  TO authenticated
  USING (id = auth.uid()::text);

-- UserSettings: cada usuário vê apenas suas configurações
CREATE POLICY IF NOT EXISTS "UserSettings_select_own"
  ON public."UserSettings" FOR SELECT
  TO authenticated
  USING (id = auth.uid()::text);

-- Task: cada usuário vê apenas suas tarefas
CREATE POLICY IF NOT EXISTS "Task_select_own"
  ON public."Task" FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- Subtask: acesso via taskId (herda do usuário dono da task)
CREATE POLICY IF NOT EXISTS "Subtask_select_own"
  ON public."Subtask" FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."Task" t
      WHERE t.id = "taskId" AND t."userId" = auth.uid()::text
    )
  );

-- Project: cada usuário vê apenas seus projetos
CREATE POLICY IF NOT EXISTS "Project_select_own"
  ON public."Project" FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- Course: cada usuário vê apenas seus cursos
CREATE POLICY IF NOT EXISTS "Course_select_own"
  ON public."Course" FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- Book: cada usuário vê apenas seus livros
CREATE POLICY IF NOT EXISTS "Book_select_own"
  ON public."Book" FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- FinancialReminder: cada usuário vê apenas seus lembretes financeiros
CREATE POLICY IF NOT EXISTS "FinancialReminder_select_own"
  ON public."FinancialReminder" FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- ChatSession: cada usuário vê apenas suas sessões de chat
CREATE POLICY IF NOT EXISTS "ChatSession_select_own"
  ON public."ChatSession" FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- ChatMessage: acesso via sessionId (herda do usuário dono da sessão)
CREATE POLICY IF NOT EXISTS "ChatMessage_select_own"
  ON public."ChatMessage" FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."ChatSession" s
      WHERE s.id = "sessionId" AND s."userId" = auth.uid()::text
    )
  );

-- ActivityLog: cada usuário vê apenas seus logs
CREATE POLICY IF NOT EXISTS "ActivityLog_select_own"
  ON public."ActivityLog" FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- =========================================
-- 6. REMOVER DEFAULT COM NOME PESSOAL
-- =========================================
ALTER TABLE public."User"
  ALTER COLUMN "name" SET DEFAULT '';

-- =========================================
-- 7. VERIFICAR ESTADO FINAL
-- =========================================
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

