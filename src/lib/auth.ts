import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const AUTH_SECRET = process.env.AUTH_SECRET || "life-os-super-secret-production-key-2026";
export const AUTH_COOKIE_NAME = "iteam_auth_token";

/**
 * Validates login username / email.
 * Rule: Only alphanumeric (a-z, 0-9) and dot (.) are allowed.
 * No spaces, no other special symbols (except @ if it's an email).
 */
export function isValidUsernameOrEmail(login: string): { valid: boolean; error?: string } {
  if (!login || login.trim() === "") {
    return { valid: false, error: "O nome de usuário ou e-mail é obrigatório." };
  }

  const trimmed = login.trim();

  // Strictly disallow any whitespace anywhere
  if (/\s/.test(trimmed)) {
    return { valid: false, error: "O nome de usuário não pode conter espaços." };
  }

  // If email format
  if (trimmed.includes("@")) {
    // Only letters, numbers and dot before @, and domain
    const emailRegex = /^[a-zA-Z0-9.]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: "Formato de e-mail inválido. Apenas letras, números e ponto (.) são permitidos antes do @." };
    }
    return { valid: true };
  }

  // If plain username: ONLY letters, numbers and dot (.)
  const usernameRegex = /^[a-zA-Z0-9.]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, error: "O nome de usuário aceita apenas letras, números e ponto (.) sem espaços ou outros caracteres." };
  }

  return { valid: true };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

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

export function createToken(payload: { id: string; email: string; name: string; role?: string }): string {
  const data = JSON.stringify({
    ...payload,
    role: payload.role || "USER",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  });
  const encodedData = Buffer.from(data).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(encodedData).digest("base64url");
  return `${encodedData}.${signature}`;
}

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

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}
