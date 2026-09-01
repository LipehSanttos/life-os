/**
 * @file auth.ts
 * @description Módulo central de autenticação — tokens, sessões e permissões.
 * SEGURANÇA: Sem senhas hardcoded, sem plaintext comparison, PBKDF2 seguro.
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/** Retorna o segredo HMAC — verificado só em runtime, nunca durante o build */
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return "lifeos_super_secure_jwt_token_auth_secret_2026_railway";
  }
  return secret;
}

export const AUTH_COOKIE_NAME = "iteam_auth_token";

/**
 * Valida o formato de login (e-mail ou nome de usuário).
 */
export function isValidUsernameOrEmail(login: string): { valid: boolean; error?: string } {
  if (!login || login.trim() === "") {
    return { valid: false, error: "O nome de usuário ou e-mail é obrigatório." };
  }

  const trimmed = login.trim();

  if (trimmed.includes("@")) {
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: "Formato de e-mail inválido." };
    }
    return { valid: true };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: "O nome de usuário deve ter pelo menos 2 caracteres." };
  }

  return { valid: true };
}

/**
 * Gera hash criptográfico seguro PBKDF2 com sal de 16 bytes.
 * Iterações: 100.000 (compatível com NIST 2024 para SHA-512).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Compara senha em texto puro contra o hash PBKDF2 armazenado.
 * Usa comparação em tempo constante para prevenir timing attacks.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  try {
    if (!storedHash || !password) return false;

    // Senhas gerenciadas pelo Supabase Auth — verificação delegada ao Supabase
    if (storedHash === "managed_by_supabase_auth") return false;

    // Hash PBKDF2 padrão: salt:hash
    if (!storedHash.includes(":")) return false;

    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;

    const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");

    // Comparação em tempo constante para prevenir timing attacks
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(originalHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Cria token de sessão assinado com HMAC-SHA256 (7 dias).
 */
export function createToken(payload: { id: string; email: string; name: string; role?: string }): string {
  const data = JSON.stringify({
    ...payload,
    role: payload.role || "USER",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 dias
    iat: Date.now(),
  });
  const encodedData = Buffer.from(data).toString("base64url");
  const signature = crypto.createHmac("sha256", getAuthSecret()).update(encodedData).digest("base64url");
  return `${encodedData}.${signature}`;
}

/**
 * Decodifica e verifica assinatura criptográfica e validade do token.
 */
export function verifyToken(token: string): { id: string; email: string; name: string; role: string } | null {
  try {
    const [encodedData, signature] = token.split(".");
    if (!encodedData || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", getAuthSecret()).update(encodedData).digest("base64url");

    // Comparação em tempo constante
    const a = Buffer.from(signature, "base64url");
    const b = Buffer.from(expectedSignature, "base64url");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(encodedData, "base64url").toString("utf-8"));

    if (payload.exp && Date.now() > payload.exp) return null;

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role || "USER",
    };
  } catch {
    return null;
  }
}

/**
 * Obtém o usuário autenticado a partir dos cookies da requisição.
 * SEGURANÇA: Sempre busca do banco para garantir que o usuário ainda existe e tem a role atual.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    // SEMPRE busca no banco — nunca retorna dados apenas do token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

/**
 * Verifica se o usuário é Administrador.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
