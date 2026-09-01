-- ==============================================================================
-- CORREÇÃO DEFINITIVA DE USUÁRIOS E RLS (SEM CONFLITO DE EMAIL)
-- ==============================================================================

-- 1. DESABILITAR RLS em todas as tabelas
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

-- 2. ATUALIZAR / SINCRONIZAR USUÁRIOS COM OS IDs CORRETOS
DO $$
BEGIN
  -- Eduardo Felipe
  IF EXISTS (SELECT 1 FROM public."User" WHERE email = 'eduardo.felipe@lifeos.com') THEN
    UPDATE public."User"
    SET
      name = 'Eduardo Felipe',
      role = 'ADMIN',
      "passwordHash" = 'managed_by_supabase_auth',
      "updatedAt" = NOW()
    WHERE email = 'eduardo.felipe@lifeos.com';
  ELSE
    INSERT INTO public."User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
    VALUES ('311c6310-323e-40cb-b504-a06e01a9f832', 'Eduardo Felipe', 'eduardo.felipe@lifeos.com', 'managed_by_supabase_auth', 'ADMIN', NOW(), NOW());
  END IF;

  -- Rodrigo
  IF EXISTS (SELECT 1 FROM public."User" WHERE email = 'keittonyr@gmail.com') THEN
    UPDATE public."User"
    SET
      name = 'Rodrigo',
      role = 'USER',
      "passwordHash" = 'managed_by_supabase_auth',
      "updatedAt" = NOW()
    WHERE email = 'keittonyr@gmail.com';
  ELSE
    INSERT INTO public."User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
    VALUES ('26cb6391-3aea-4830-8c51-937ffcdd4447', 'Rodrigo', 'keittonyr@gmail.com', 'managed_by_supabase_auth', 'USER', NOW(), NOW());
  END IF;
END $$;

-- 3. GARANTIR CONFIGURAÇÕES INICIAIS
INSERT INTO public."UserSettings" (id, name, email, theme, "createdAt", "updatedAt")
SELECT id, name, email, 'dark', NOW(), NOW()
FROM public."User"
ON CONFLICT (id) DO NOTHING;

-- 4. VERIFICAÇÃO FINAL
SELECT id, name, email, role, "passwordHash" FROM public."User";
