-- ==============================================================================
-- CORREÇÃO EMERGENCIAL: DESABILITAR RLS E RECRIAR USUÁRIOS
-- Execute isso imediatamente no SQL Editor do Supabase
-- ==============================================================================

-- 1. DESABILITAR RLS em todas as tabelas (o backend usa service_role que já bypassa RLS,
--    mas o cliente SDK não estava enviando o header correto)
ALTER TABLE public."User"              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserSettings"      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Task"              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subtask"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Project"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Course"            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Book"              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinancialReminder" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChatSession"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChatMessage"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ActivityLog"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Category"          DISABLE ROW LEVEL SECURITY;

-- 2. RECRIAR OS USUÁRIOS NA TABELA (caso estejam faltando)
INSERT INTO public."User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES
  (
    '311c6310-323e-40cb-b504-a06e01a9f832',
    'Eduardo Felipe',
    'eduardo.felipe@lifeos.com',
    'managed_by_supabase_auth',
    'ADMIN',
    NOW(),
    NOW()
  ),
  (
    '26cb6391-3aea-4830-8c51-937ffcdd4447',
    'Rodrigo',
    'keittonyr@gmail.com',
    'managed_by_supabase_auth',
    'USER',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  "updatedAt" = NOW();

-- 3. RECRIAR USERSETTINGS
INSERT INTO public."UserSettings" (id, name, email, theme, "createdAt", "updatedAt")
VALUES
  ('311c6310-323e-40cb-b504-a06e01a9f832', 'Eduardo Felipe', 'eduardo.felipe@lifeos.com', 'dark', NOW(), NOW()),
  ('26cb6391-3aea-4830-8c51-937ffcdd4447', 'Rodrigo', 'keittonyr@gmail.com', 'dark', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. VERIFICAR RESULTADO
SELECT id, name, email, role FROM public."User";
