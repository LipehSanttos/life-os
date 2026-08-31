/**
 * @file auth.ts
 * @description Módulo central de autenticação e gestão de usuários integrado ao Supabase Auth & Prisma.
 * Suporta tokens Supabase, controle de sessões, controle de permissões (RBAC) e sincronização de perfis.
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

/** Chave secreta para assinatura dos tokens de autenticação (HMAC) */
const AUTH_SECRET = process.env.AUTH_SECRET || "life-os-super-secret-production-key-2026";

/** Nome do cookie HTTP-Only utilizado para persistir a sessão do usuário */
export const AUTH_COOKIE_NAME = "iteam_auth_token";

/**
 * Valida o formato de login (e-mail ou nome de usuário).
 */
export function isValidUsernameOrEmail(login: string): { valid: boolean; error?: string } {
  if (!login || login.trim() === "") {
    return { valid: false, error: "O nome de usuário ou e-mail é obrigatório." };
  }

  const trimmed = login.trim();

  if (/\s/.test(trimmed)) {
    return { valid: false, error: "O nome de usuário não pode conter espaços." };
  }

  if (trimmed.includes("@")) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: "Formato de e-mail inválido." };
    }
    return { valid: true };
  }

  const usernameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, error: "O nome de usuário aceita apenas letras, números, ponto (.) e traço (-)." };
  }

  return { valid: true };
}

/**
 * Gera um hash criptográfico seguro para a senha utilizando PBKDF2 com Salt aleatório de 16 bytes.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Compara uma senha em texto puro com o hash PBKDF2 armazenado.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === originalHash;
  } catch {
    return false;
  }
}

/**
 * Cria um token de sessão assinado digitalmente com HMAC-SHA256 e validade de 30 dias.
 */
export function createToken(payload: { id: string; email: string; name: string; role?: string }): string {
  const data = JSON.stringify({
    ...payload,
    role: payload.role || "USER",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 dias
  });
  const encodedData = Buffer.from(data).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(encodedData).digest("base64url");
  return `${encodedData}.${signature}`;
}

/**
 * Decodifica e verifica a assinatura criptográfica e a validade temporal do token de sessão.
 */
export function verifyToken(token: string): { id: string; email: string; name: string; role: string } | null {
  try {
    const [encodedData, signature] = token.split(".");
    if (!encodedData || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(encodedData).digest("base64url");
    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(encodedData, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;

    return { id: payload.id, email: payload.email, name: payload.name, role: payload.role || "USER" };
  } catch {
    return null;
  }
}

/**
 * Recupera o usuário autenticado na requisição atual a partir dos cookies HTTP (Supabase Auth ou Cookie de Sessão).
 */
export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    // 1. Tenta verificar token de sessão padrão
    const verified = verifyToken(token);
    if (verified) {
      const user = await prisma.user.findUnique({
        where: { id: verified.id },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      });

      if (user) return user;
    }

    // 2. Se o Supabase estiver configurado, tenta validar token diretamente com o Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token);
        if (sbUser && !error && sbUser.email) {
          // Sincroniza ou recupera o perfil correspondente no banco
          let user = await prisma.user.findUnique({
            where: { email: sbUser.email },
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                id: sbUser.id,
                email: sbUser.email,
                name: (sbUser.user_metadata?.name as string) || sbUser.email,
                role: (sbUser.user_metadata?.role as string) || "USER",
                passwordHash: hashPassword(crypto.randomBytes(32).toString("hex")),
              },
              select: { id: true, name: true, email: true, role: true, avatarUrl: true },
            });
          }

          return user;
        }
      } catch (sbErr) {
        // Ignora erro de Supabase e retorna null se falhar
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Verifica se o usuário atual autenticado possui privilégios de Administrador (`ADMIN`).
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}
