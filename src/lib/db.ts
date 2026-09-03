/**
 * @file db.ts
 * @description Driver de banco de dados direto para o Supabase (PostgreSQL via HTTPS REST API).
 * Elimina a dependência de conexões de pooling PostgreSQL (portas 6543/5432) e executa
 * todas as operações diretamente com o Supabase SDK através de NEXT_PUBLIC_SUPABASE_URL e chaves.
 */

import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

function applyWhereClause(query: any, where?: Record<string, any>): any {
  if (!where || typeof where !== "object") return query;

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (key === "AND" && Array.isArray(value)) {
      for (const andItem of value) {
        query = applyWhereClause(query, andItem);
      }
      continue;
    }

    if (key === "OR" && Array.isArray(value)) {
      const orConditions = value
        .map((cond: Record<string, any>) => {
          const subKey = Object.keys(cond)[0];
          const subVal = cond[subKey];
          if (typeof subVal === "object" && subVal !== null) {
            if ("equals" in subVal) return `${subKey}.ilike.${subVal.equals}`;
            if ("contains" in subVal) return `${subKey}.ilike.%${subVal.contains}%`;
          }
          if (subKey === "email" || subKey === "name") {
            return `${subKey}.ilike.${subVal}`;
          }
          return `${subKey}.eq.${subVal}`;
        })
        .filter(Boolean)
        .join(",");
      if (orConditions) {
        query = query.or(orConditions);
      }
      continue;
    }

    if (key === "NOT" && typeof value === "object" && value !== null) {
      for (const [notKey, notVal] of Object.entries(value)) {
        query = query.neq(notKey, notVal);
      }
      continue;
    }

    if (typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value)) {
      if ("equals" in value) {
        query = query.eq(key, value.equals);
      }
      if ("in" in value && Array.isArray(value.in)) {
        query = query.in(key, value.in);
      }
      if ("notIn" in value && Array.isArray(value.notIn)) {
        query = query.not(key, "in", `(${value.notIn.join(",")})`);
      }
      if ("contains" in value) {
        query = query.ilike(key, `%${value.contains}%`);
      }
      if ("gte" in value) {
        const val = value.gte instanceof Date ? value.gte.toISOString() : value.gte;
        query = query.gte(key, val);
      }
      if ("gt" in value) {
        const val = value.gt instanceof Date ? value.gt.toISOString() : value.gt;
        query = query.gt(key, val);
      }
      if ("lte" in value) {
        const val = value.lte instanceof Date ? value.lte.toISOString() : value.lte;
        query = query.lte(key, val);
      }
      if ("lt" in value) {
        const val = value.lt instanceof Date ? value.lt.toISOString() : value.lt;
        query = query.lt(key, val);
      }
      if ("not" in value) {
        query = query.neq(key, value.not);
      }
    } else if (value === null) {
      query = query.is(key, null);
    } else if (value instanceof Date) {
      query = query.eq(key, value.toISOString());
    } else {
      query = query.eq(key, value);
    }
  }

  return query;
}

function applyOrderBy(query: any, orderBy?: any): any {
  if (!orderBy) return query;

  if (Array.isArray(orderBy)) {
    for (const order of orderBy) {
      for (const [col, dir] of Object.entries(order)) {
        query = query.order(col, { ascending: dir === "asc" });
      }
    }
  } else if (typeof orderBy === "object") {
    for (const [col, dir] of Object.entries(orderBy)) {
      query = query.order(col, { ascending: dir === "asc" });
    }
  }

  return query;
}

function buildSelectFields(include?: any, select?: any): string {
  if (select) {
    return Object.keys(select).join(",");
  }
  if (!include) return "*";

  const includesList: string[] = ["*"];
  if (include.category) includesList.push("category:Category(*)");
  if (include.project) includesList.push("project:Project(*)");
  if (include.course) includesList.push("course:Course(*)");
  if (include.book) includesList.push("book:Book(*)");
  if (include.subtasks) includesList.push("subtasks:Subtask(*)");
  if (include.tasks) includesList.push("tasks:Task(*)");
  if (include.financialReminder) includesList.push("financialReminder:FinancialReminder(*)");
  if (include.messages) includesList.push("messages:ChatMessage(*)");
  if (include.user) includesList.push("user:User(id,name,email,avatarUrl,role,createdAt)");

  return includesList.join(",");
}

export interface TableClient {
  findMany(args?: {
    where?: any;
    include?: any;
    select?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  }): Promise<any[]>;

  findFirst(args?: {
    where?: any;
    select?: any;
    include?: any;
    orderBy?: any;
  }): Promise<any | null>;

  findUnique(args: {
    where: Record<string, any>;
    select?: any;
    include?: any;
  }): Promise<any | null>;

  create(args: { data: Record<string, any>; select?: any; include?: any }): Promise<any>;

  createMany(args: { data: Record<string, any>[] }): Promise<{ count: number }>;

  update(args: {
    where: Record<string, any>;
    data: Record<string, any>;
    select?: any;
    include?: any;
  }): Promise<any>;

  updateMany(args: {
    where: Record<string, any>;
    data: Record<string, any>;
  }): Promise<{ count: number }>;

  upsert(args: {
    where: Record<string, any>;
    update: Record<string, any>;
    create: Record<string, any>;
    select?: any;
    include?: any;
  }): Promise<any>;

  delete(args: { where: Record<string, any> }): Promise<any>;

  deleteMany(args: { where: Record<string, any> }): Promise<{ count: number }>;

  count(args?: { where?: any }): Promise<number>;
}

const tablesWithUpdatedAt = new Set([
  "User",
  "UserSettings",
  "Category",
  "Project",
  "Course",
  "Book",
  "FinancialReminder",
  "Task",
  "Subtask",
  "ChatSession",
]);

const relationalFields = new Set([
  "subtasks",
  "tasks",
  "category",
  "project",
  "course",
  "book",
  "financialReminder",
  "messages",
  "user",
  "session",
  "activityLogs",
  "_count",
]);

function cleanDataForTable(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== "object") return {};
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (relationalFields.has(key)) continue;
    if (typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value)) {
      if ("create" in value || "connect" in value || "disconnect" in value || "set" in value) {
        continue;
      }
    }
    cleaned[key] = value;
  }
  return cleaned;
}

function createTableClient(tableName: string): TableClient {
  return {
    async findMany(args: {
      where?: any;
      include?: any;
      select?: any;
      orderBy?: any;
      take?: number;
      skip?: number;
    } = {}): Promise<any[]> {
      const selectFields = buildSelectFields(args.include, args.select);

      let query: any = supabaseAdmin.from(tableName).select(selectFields);
      query = applyWhereClause(query, args.where);
      query = applyOrderBy(query, args.orderBy);

      if (args.skip !== undefined && args.take !== undefined) {
        query = query.range(args.skip, args.skip + args.take - 1);
      } else if (args.take !== undefined) {
        query = query.limit(args.take);
      }

      let { data, error } = await query;

      // Fallback gracioso caso o select com joins do PostgREST retorne erro
      if (error && selectFields !== "*") {
        console.warn(`[db] Join falhou em ${tableName}, executando fallback select(*):`, error.message);
        let fallbackQuery: any = supabaseAdmin.from(tableName).select("*");
        fallbackQuery = applyWhereClause(fallbackQuery, args.where);
        fallbackQuery = applyOrderBy(fallbackQuery, args.orderBy);
        if (args.skip !== undefined && args.take !== undefined) {
          fallbackQuery = fallbackQuery.range(args.skip, args.skip + args.take - 1);
        } else if (args.take !== undefined) {
          fallbackQuery = fallbackQuery.limit(args.take);
        }
        const fallbackRes = await fallbackQuery;
        if (!fallbackRes.error) {
          data = fallbackRes.data;
          error = null;
        }
      }

      if (error) {
        console.error(`[db] Erro em ${tableName}.findMany:`, error.message || error);
        throw new Error(error.message || "Erro ao consultar dados.");
      }

      if (args.include?._count && Array.isArray(data)) {
        for (const item of data) {
          (item as any)._count = {
            tasks: 0,
            projects: 0,
            courses: 0,
            books: 0,
            financialReminders: 0,
          };
        }
      }

      return data || [];
    },

    async findFirst(args: {
      where?: any;
      select?: any;
      include?: any;
      orderBy?: any;
    } = {}): Promise<any | null> {
      const selectFields = buildSelectFields(args.include, args.select);

      let query: any = supabaseAdmin.from(tableName).select(selectFields);
      query = applyWhereClause(query, args.where);
      query = applyOrderBy(query, args.orderBy);
      query = query.limit(1);

      let { data, error } = await query;

      if (error && selectFields !== "*") {
        console.warn(`[db] Join falhou em ${tableName}.findFirst, tentando fallback select(*):`, error.message);
        let fallbackQuery: any = supabaseAdmin.from(tableName).select("*");
        fallbackQuery = applyWhereClause(fallbackQuery, args.where);
        fallbackQuery = applyOrderBy(fallbackQuery, args.orderBy);
        fallbackQuery = fallbackQuery.limit(1);
        const fallbackRes = await fallbackQuery;
        if (!fallbackRes.error) {
          data = fallbackRes.data;
          error = null;
        }
      }

      if (error) {
        console.error(`[db] Erro em ${tableName}.findFirst:`, error.message || error);
        throw new Error(error.message || "Erro ao buscar registro.");
      }
      return data && data.length > 0 ? data[0] : null;
    },

    async findUnique(args: {
      where: Record<string, any>;
      select?: any;
      include?: any;
    }): Promise<any | null> {
      const selectFields = buildSelectFields(args.include, args.select);

      let query: any = supabaseAdmin.from(tableName).select(selectFields);
      query = applyWhereClause(query, args.where);
      query = query.limit(1);

      let { data, error } = await query;

      if (error && selectFields !== "*") {
        let fallbackQuery: any = supabaseAdmin.from(tableName).select("*");
        fallbackQuery = applyWhereClause(fallbackQuery, args.where);
        fallbackQuery = fallbackQuery.limit(1);
        const fallbackRes = await fallbackQuery;
        if (!fallbackRes.error) {
          data = fallbackRes.data;
          error = null;
        }
      }

      if (error) {
        console.error(`[db] Erro em ${tableName}.findUnique:`, error.message || error);
        throw new Error(error.message || "Erro ao buscar registro único.");
      }
      return data && data.length > 0 ? data[0] : null;
    },

    async create(args: { data: Record<string, any>; select?: any; include?: any }): Promise<any> {
      const sanitized = cleanDataForTable(args.data);
      const payload: Record<string, any> = {
        ...sanitized,
        id: sanitized.id || crypto.randomUUID(),
      };

      if (tablesWithUpdatedAt.has(tableName)) {
        payload.updatedAt = new Date().toISOString();
      }

      const { data, error } = await supabaseAdmin
        .from(tableName)
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error(`[db] Erro em ${tableName}.create:`, error.message || error);
        throw new Error(error.message || "Erro ao criar registro.");
      }
      return data;
    },

    async createMany(args: { data: Record<string, any>[] }): Promise<{ count: number }> {
      const payload = args.data.map((item) => {
        const sanitized = cleanDataForTable(item);
        const itemPayload: Record<string, any> = {
          ...sanitized,
          id: sanitized.id || crypto.randomUUID(),
        };
        if (tablesWithUpdatedAt.has(tableName)) {
          itemPayload.updatedAt = new Date().toISOString();
        }
        return itemPayload;
      });

      const { data, error } = await supabaseAdmin.from(tableName).insert(payload).select();
      if (error) {
        console.error(`[db] Erro em ${tableName}.createMany:`, error.message || error);
        throw new Error(error.message || "Erro ao criar múltiplos registros.");
      }
      return { count: data?.length || 0 };
    },

    async update(args: { where: Record<string, any>; data: Record<string, any>; select?: any; include?: any }): Promise<any> {
      const sanitized = cleanDataForTable(args.data);
      const updatePayload: Record<string, any> = {
        ...sanitized,
      };

      if (tablesWithUpdatedAt.has(tableName)) {
        updatePayload.updatedAt = new Date().toISOString();
      }

      let query: any = supabaseAdmin.from(tableName).update(updatePayload);
      query = applyWhereClause(query, args.where);
      const { data, error } = await query.select().single();

      if (error) {
        console.error(`[db] Erro em ${tableName}.update:`, error.message || error);
        throw new Error(error.message || "Erro ao atualizar registro.");
      }
      return data;
    },

    async updateMany(args: { where: Record<string, any>; data: Record<string, any> }): Promise<{ count: number }> {
      const sanitized = cleanDataForTable(args.data);
      const updatePayload: Record<string, any> = {
        ...sanitized,
      };

      if (tablesWithUpdatedAt.has(tableName)) {
        updatePayload.updatedAt = new Date().toISOString();
      }

      let query: any = supabaseAdmin.from(tableName).update(updatePayload);
      query = applyWhereClause(query, args.where);
      const { data, error } = await query.select();

      if (error) {
        console.error(`[db] Erro em ${tableName}.updateMany:`, error.message || error);
        throw new Error(error.message || "Erro ao atualizar registros.");
      }
      return { count: data?.length || 0 };
    },

    async upsert(args: {
      where: Record<string, any>;
      update: Record<string, any>;
      create: Record<string, any>;
      select?: any;
    }): Promise<any> {
      const existing = await this.findFirst({ where: args.where });
      if (existing) {
        return this.update({ where: args.where, data: args.update });
      } else {
        return this.create({ data: args.create });
      }
    },

    async delete(args: { where: Record<string, any> }): Promise<any> {
      let query: any = supabaseAdmin.from(tableName).delete();
      query = applyWhereClause(query, args.where);
      const { data, error } = await query.select().single();

      if (error) {
        console.error(`[db] Erro em ${tableName}.delete:`, error.message || error);
        throw new Error(error.message || "Erro ao deletar registro.");
      }
      return data;
    },

    async deleteMany(args: { where: Record<string, any> }): Promise<{ count: number }> {
      let query: any = supabaseAdmin.from(tableName).delete();
      query = applyWhereClause(query, args.where);
      const { data, error } = await query.select();

      if (error) {
        console.error(`[db] Erro em ${tableName}.deleteMany:`, error.message || error);
        throw new Error(error.message || "Erro ao deletar registros.");
      }
      return { count: data?.length || 0 };
    },

    async count(args: { where?: any } = {}): Promise<number> {
      let query: any = supabaseAdmin.from(tableName).select("*", { count: "exact", head: true });
      query = applyWhereClause(query, args.where);
      const { count, error } = await query;

      if (error) {
        console.warn(`[db] Aviso em ${tableName}.count:`, error.message);
        return 0;
      }
      return count || 0;
    },
  };
}

export interface SupabaseDatabaseClient {
  user: TableClient;
  userSettings: TableClient;
  category: TableClient;
  project: TableClient;
  course: TableClient;
  book: TableClient;
  financialReminder: TableClient;
  task: TableClient;
  subtask: TableClient;
  activityLog: TableClient;
  chatSession: TableClient;
  chatMessage: TableClient;
}

/**
 * Cliente de banco de dados universal que opera diretamente via Supabase SDK (HTTPS).
 * Elimina totalmente a necessidade de Prisma Client, pooling PostgreSQL e portas TCP.
 */
export const db: SupabaseDatabaseClient = {
  user: createTableClient("User"),
  userSettings: createTableClient("UserSettings"),
  category: createTableClient("Category"),
  project: createTableClient("Project"),
  course: createTableClient("Course"),
  book: createTableClient("Book"),
  financialReminder: createTableClient("FinancialReminder"),
  task: createTableClient("Task"),
  subtask: createTableClient("Subtask"),
  activityLog: createTableClient("ActivityLog"),
  chatSession: createTableClient("ChatSession"),
  chatMessage: createTableClient("ChatMessage"),
};

/**
 * Exporta como `prisma` para compatibilidade total e transparente com todos os módulos existentes.
 */
export const prisma = db;
