/**
 * @file db.ts
 * @description Instância singleton do Prisma Client para conexões seguras com o banco SQLite/Postgres.
 * Previne esgotamento de conexões e instâncias duplicadas durante o Hot Reload em desenvolvimento.
 */

import { PrismaClient } from "@prisma/client";

// Define a URL padrão local caso a variável de ambiente não esteja declarada
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
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "file:./dev.db",
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
