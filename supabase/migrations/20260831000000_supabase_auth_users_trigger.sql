-- ==============================================================================
-- LIFE OS - TRIGGER DE SINCRONIZAÇÃO AUTOMÁTICA DO SUPABASE AUTH COM PUBLIC.USER
-- ==============================================================================
-- Quando um usuário for criado no Supabase Auth (auth.users),
-- esta trigger insere automaticamente o registro correspondente em public."User"
-- e public."UserSettings", garantindo isolamento total multi-tenant.
-- ==============================================================================

-- 1. Função de manipulação de novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criação ou atualização do perfil público
  INSERT INTO public."User" (id, email, name, role, "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'USER'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    "updatedAt" = NOW();

  -- Criação das configurações padrão do usuário
  INSERT INTO public."UserSettings" (id, name, email, theme, "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'dark',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Vinculação da Trigger à tabela auth.users do Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Função para exclusão em cascata quando usuário for removido do Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public."User" WHERE id = OLD.id::text;
  DELETE FROM public."UserSettings" WHERE id = OLD.id::text;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

