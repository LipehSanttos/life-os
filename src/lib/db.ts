/**
 * @file db.ts
 * @description Instância singleton do Prisma Client para conexões com o banco de dados.
 * Inclui tratamento de fallback para variáveis de ambiente ausentes no deploy.
 */

import { PrismaClient } from "@prisma/client";

// Define fallback seguro caso DATABASE_URL não tenha sido definida no painel de variáveis
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

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
