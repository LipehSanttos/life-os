/**
 * @file admin.ts
 * @description Cliente Administrativo do Supabase com privilégios de Service Role.
 * Utilizado no servidor para autenticação, provisionamento, exclusão e gestão de usuários.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null = null;
let lastUsedUrl: string | null = null;
let lastUsedKey: string | null = null;

/**
 * Retorna se o Supabase está configurado com URL e Chave válidas.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

/**
 * Obtém ou inicializa a instância administrativa do Supabase com verificação dinâmica de ambiente.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://vbenjekbrfompfmjvjqf.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  if (!cachedAdminClient || lastUsedUrl !== url || lastUsedKey !== key) {
    cachedAdminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = key;
  }

  return cachedAdminClient;
}

/**
 * Proxy dinâmico que sempre despacha chamadas para o cliente Supabase com credenciais ativas.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const client = getSupabaseAdmin() as any;
    const val = client[prop];
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});
