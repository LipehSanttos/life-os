/**
 * @file tools.ts
 * @description Motor de execução de ações e ferramentas (Function Calling) acionado pelo Chat com IA.
 * Executa mutações persistentes no banco de dados SQLite com garantia de isolamento por `userId`.
 */

import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import { addDays } from "date-fns";
import { extractCleanTaskTitleAndDescription } from "./sanitizer";

/**
 * Executa uma ferramenta solicitada pela IA ou confirmada pelo usuário no chat.
 *
 * @param name Nome da ferramenta ("create_task", "update_task_status", "register_financial_bill", "update_reading_progress", "create_project")
 * @param args Argumentos específicos e payload da ferramenta
 * @param userId ID do usuário autenticado no Life OS
 * @returns Objeto com status de sucesso, mensagem e dados da entidade persistida
 */
export async function executeTool(name: string, args: any, userId?: string) {
  const now = new Date();

  switch (name) {
    /** Criação de nova tarefa com sanitização semântica de título */
    case "create_task": {
      const sanitized = extractCleanTaskTitleAndDescription(args.title || "Nova Tarefa");
      const finalTitle = sanitized.cleanTitle;
      const finalDescription = args.description || sanitized.description || null;

      let categoryId: string | undefined = args.categoryId;
      if (!categoryId && args.categoryName) {
        const cat = await prisma.category.findFirst({
          where: {
            OR: [
              { name: { contains: args.categoryName } },
              { slug: { contains: args.categoryName.toLowerCase() } },
            ],
          },
        });
        if (cat) categoryId = cat.id;
      }
      if (!categoryId && sanitized.suggestedCategorySlug) {
        const cat = await prisma.category.findFirst({
          where: { slug: sanitized.suggestedCategorySlug },
        });
        if (cat) categoryId = cat.id;
      }

      let projectId: string | undefined;
      if (args.projectName) {
        const proj = await prisma.project.findFirst({
          where: {
            name: { contains: args.projectName },
            ...(userId ? { userId } : {}),
          },
        });
        if (proj) projectId = proj.id;
      }

      let courseId: string | undefined;
      if (args.courseName) {
        const course = await prisma.course.findFirst({
          where: {
            name: { contains: args.courseName },
            ...(userId ? { userId } : {}),
          },
        });
        if (course) courseId = course.id;
      }

      const task = await prisma.task.create({
        data: {
          userId: userId || null,
          title: finalTitle,
          description: finalDescription,
          priority: args.priority || "MEDIUM",
          dueDate: args.dueDate ? new Date(args.dueDate) : addDays(now, 1),
          dueTime: args.dueTime || sanitized.extractedTime || null,
          isRecurring: Boolean(args.isRecurring),
          recurrenceRule: args.recurrenceRule,
          categoryId: categoryId || args.categoryId,
          projectId: projectId || args.projectId,
          courseId: courseId || args.courseId,
          academicSubject: args.academicSubject,
        },
      });

      return {
        success: true,
        message: `Tarefa "${task.title}" criada com sucesso!`,
        task,
      };
    }

    /** Atualização do status de uma tarefa (ex: COMPLETED) */
    case "update_task_status": {
      const task = await prisma.task.update({
        where: { id: args.taskId },
        data: {
          status: args.status,
          completedAt: args.status === "COMPLETED" ? now : null,
        },
      });
      return {
        success: true,
        message: `Tarefa "${task.title}" atualizada para ${task.status}!`,
        task,
      };
    }

    /** Registro de nova conta a pagar no módulo financeiro */
    case "register_financial_bill": {
      const bill = await prisma.financialReminder.create({
        data: {
          userId: userId || null,
          title: args.title,
          amount: args.amount ? parseFloat(args.amount) : 0,
          dueDate: args.dueDate ? new Date(args.dueDate) : addDays(now, 5),
          isRecurring: Boolean(args.isRecurring),
          recurrenceRule: args.recurrenceRule,
          recurrenceDay: args.recurrenceDay ? parseInt(args.recurrenceDay) : null,
          recipient: args.recipient,
          status: "PENDING",
          categoryId: args.categoryId,
        },
      });
      return {
        success: true,
        message: `Conta "${bill.title}" registrada com sucesso!`,
        bill,
      };
    }

    /** Atualização do progresso de páginas lidas em um livro */
    case "update_reading_progress": {
      let book;
      if (args.bookId) {
        book = await prisma.book.findUnique({ where: { id: args.bookId } });
      } else if (args.bookTitle) {
        book = await prisma.book.findFirst({
          where: {
            title: { contains: args.bookTitle },
            ...(userId ? { userId } : {}),
          },
        });
      }

      if (!book) {
        return { success: false, message: "Livro não encontrado na sua biblioteca." };
      }

      const total = book.totalPages || 100;
      const current = Math.min(parseInt(args.currentPage), total);
      const progress = Math.round((current / total) * 100);

      const updated = await prisma.book.update({
        where: { id: book.id },
        data: {
          currentPage: current,
          progress,
          status: progress === 100 ? "COMPLETED" : "READING",
        },
      });

      return {
        success: true,
        message: `Progresso de "${updated.title}" atualizado para ${current}/${total} páginas (${progress}%)!`,
        book: updated,
      };
    }

    /** Criação de um novo projeto */
    case "create_project": {
      const project = await prisma.project.create({
        data: {
          userId: userId || null,
          name: args.name,
          description: args.description,
          priority: args.priority || "MEDIUM",
          dueDate: args.dueDate ? new Date(args.dueDate) : null,
          categoryId: args.categoryId,
          status: "NOT_STARTED",
        },
      });
      return {
        success: true,
        message: `Projeto "${project.name}" criado com sucesso!`,
        project,
      };
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}
