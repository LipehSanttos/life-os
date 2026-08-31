/**
 * @file admin.ts
 * @description Cliente Administrativo do Supabase com privilégios de Service Role.
 * Utilizado no servidor para autenticação, provisionamento, exclusão e gestão de usuários.
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Retorna se o Supabase está configurado com URL e Chave válidas.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://placeholder-project.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-service-role-key";

/**
 * Instância administrativa do Supabase Client com acesso total a `auth.admin`.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

