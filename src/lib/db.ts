/**
 * @file db.ts
 * @description Instância singleton do Prisma Client para conexões seguras com PostgreSQL (Supabase).
 * Previne esgotamento de conexões e instâncias duplicadas durante o Hot Reload em desenvolvimento.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Cliente singleton do Prisma ORM compartilhado em toda a aplicação.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
