import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import { addDays } from "date-fns";

export async function executeTool(name: string, args: any, userId?: string) {
  const now = new Date();

  switch (name) {
    case "create_task": {
      let categoryId: string | undefined;
      if (args.categoryName) {
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
          title: args.title,
          description: args.description,
          priority: args.priority || "MEDIUM",
          dueDate: args.dueDate ? new Date(args.dueDate) : addDays(now, 1),
          dueTime: args.dueTime,
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

    case "register_financial_bill": {
      let categoryId: string | undefined;
      const catFin = await prisma.category.findFirst({ where: { slug: "financas" } });
      if (catFin) categoryId = catFin.id;

      const bill = await prisma.financialReminder.create({
        data: {
          userId: userId || null,
          title: args.title,
          amount: args.amount ? parseFloat(args.amount) : 0,
          dueDate: args.dueDate ? new Date(args.dueDate) : addDays(now, 10),
          isRecurring: Boolean(args.isRecurring),
          recurrenceRule: args.recurrenceRule || (args.isRecurring ? "MONTHLY" : null),
          recurrenceDay: args.recurrenceDay || null,
          recipient: args.recipient || null,
          categoryId: categoryId || args.categoryId,
        },
      });

      return {
        success: true,
        message: `Lembrete financeiro "${bill.title}" no valor de ${formatCurrency(bill.amount)} cadastrado!`,
        bill,
      };
    }

    case "update_reading_progress": {
      let book: any = null;
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
        // Create new book if not existing
        book = await prisma.book.create({
          data: {
            userId: userId || null,
            title: args.bookTitle || "Livro em Leitura",
            totalPages: 250,
            currentPage: args.currentPage || 1,
            progress: Math.round(((args.currentPage || 1) / 250) * 100),
          },
        });
      } else {
        const nextProgress = Math.min(Math.round((args.currentPage / book.totalPages) * 100), 100);
        book = await prisma.book.update({
          where: { id: book.id },
          data: {
            currentPage: args.currentPage,
            progress: nextProgress,
            status: nextProgress === 100 ? "COMPLETED" : "READING",
          },
        });
      }

      return {
        success: true,
        message: `Progresso de "${book.title}" atualizado para página ${book.currentPage} (${book.progress}%)! 📖`,
        book,
      };
    }

    case "create_project": {
      const proj = await prisma.project.create({
        data: {
          userId: userId || null,
          name: args.name,
          description: args.description,
          priority: args.priority || "MEDIUM",
          dueDate: args.dueDate ? new Date(args.dueDate) : null,
          color: args.color || "#3b82f6",
        },
      });

      return {
        success: true,
        message: `Projeto "${proj.name}" criado com sucesso! 📁`,
        project: proj,
      };
    }

    case "update_task_status": {
      const task = await prisma.task.update({
        where: { id: args.taskId },
        data: {
          status: args.status,
          completedAt: args.status === "COMPLETED" ? new Date() : null,
        },
      });

      return {
        success: true,
        message: `Tarefa "${task.title}" atualizada para ${task.status}!`,
        task,
      };
    }

    default:
      return { success: false, message: `Ferramenta "${name}" não encontrada.` };
  }
}
