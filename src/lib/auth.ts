/**
 * @file auth.ts
 * @description Módulo central de autenticação, criptografia de senhas, validação de credenciais,
 * geração/verificação de tokens de sessão (HMAC SHA-256) e controle de permissões de acesso (RBAC).
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/** Chave secreta para assinatura dos tokens de autenticação (HMAC) */
const AUTH_SECRET = process.env.AUTH_SECRET || "life-os-super-secret-production-key-2026";

/** Nome do cookie HTTP-Only utilizado para persistir a sessão do usuário */
export const AUTH_COOKIE_NAME = "iteam_auth_token";

/**
 * Valida o nome de usuário ou e-mail fornecido na autenticação/cadastro.
 * Regra de Segurança: Aceita estritamente caracteres alfanuméricos (a-z, 0-9) e ponto (.).
 * Proíbe espaços, caracteres de injeção ou símbolos especiais.
 *
 * @param login Nome de usuário ou e-mail a ser validado
 * @returns Objeto indicando se é válido e mensagem de erro explicativa em caso de falha
 */
export function isValidUsernameOrEmail(login: string): { valid: boolean; error?: string } {
  if (!login || login.trim() === "") {
    return { valid: false, error: "O nome de usuário ou e-mail é obrigatório." };
  }

  const trimmed = login.trim();

  // Proíbe rigorosamente qualquer tipo de espaço em branco
  if (/\s/.test(trimmed)) {
    return { valid: false, error: "O nome de usuário não pode conter espaços." };
  }

  // Validação quando fornecido no formato de e-mail
  if (trimmed.includes("@")) {
    const emailRegex = /^[a-zA-Z0-9.]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: "Formato de e-mail inválido. Apenas letras, números e ponto (.) são permitidos antes do @." };
    }
    return { valid: true };
  }

  // Validação para nome de usuário simples: apenas letras, números e ponto
  const usernameRegex = /^[a-zA-Z0-9.]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, error: "O nome de usuário aceita apenas letras, números e ponto (.) sem espaços ou outros caracteres." };
  }

  return { valid: true };
}

/**
 * Gera um hash criptográfico seguro para a senha utilizando PBKDF2 com Salt aleatório de 16 bytes.
 *
 * @param password Senha em texto puro a ser criptografada
 * @returns String contendo salt e hash separados por dois pontos (`salt:hash`)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Compara uma senha em texto puro com o hash criptográfico armazenado no banco de dados.
 *
 * @param password Senha fornecida na tentativa de login
 * @param storedHash Hash armazenado no banco (`salt:hash`)
 * @returns Booleano indicando se a senha corresponde ao hash
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
 *
 * @param payload Informações do usuário (id, email, name, role)
 * @returns Token formatado como `encodedData.signature`
 */
export function createToken(payload: { id: string; email: string; name: string; role?: string }): string {
  const data = JSON.stringify({
    ...payload,
    role: payload.role || "USER",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // Validade de 30 dias
  });
  const encodedData = Buffer.from(data).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(encodedData).digest("base64url");
  return `${encodedData}.${signature}`;
}

/**
 * Decodifica e verifica a assinatura criptográfica e a validade temporal do token de sessão.
 *
 * @param token Token de sessão recebido no cookie HTTP
 * @returns Payload do usuário se o token for válido e não expirado, ou `null` caso contrário
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
 * Recupera o usuário autenticado na requisição atual a partir do cookie HTTP de sessão.
 * Utilizado por todas as rotas de API para garantir o isolamento estrito de dados (`userId`).
 *
 * @returns Objeto com os dados do usuário autenticado no banco ou `null` se não autenticado
 */
export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const verified = verifyToken(token);
    if (!verified) return null;

    const user = await prisma.user.findUnique({
      where: { id: verified.id },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    return user;
  } catch {
    return null;
  }
}

/**
 * Verifica se o usuário atual autenticado possui privilégios de Administrador (`ADMIN`).
 * Utilizado para proteger endpoints e telas de gestão global de usuários.
 *
 * @returns Objeto do usuário se for ADMIN ou `null` caso contrário
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}
