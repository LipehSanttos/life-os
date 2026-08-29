/**
 * @file route.ts (API /api/tasks)
 * @description Endpoint REST para consulta e criação de tarefas.
 * Implementa isolamento estrito de dados por `userId`, filtros por status, prioridade,
 * categorias, projetos e janelas temporais ("today", "upcoming7", "overdue").
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addDays, startOfDay, endOfDay } from "date-fns";

/**
 * GET /api/tasks
 * Lista todas as tarefas do usuário autenticado aplicando filtros opcionais de busca e tempo.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const categoryId = searchParams.get("categoryId");
    const projectId = searchParams.get("projectId");
    const courseId = searchParams.get("courseId");
    const isInbox = searchParams.get("isInbox");
    const timeFrame = searchParams.get("timeFrame");
    const search = searchParams.get("search");

    const now = new Date();
    // Cláusula de isolamento estrito por usuário
    const whereClause: any = { userId: user.id };

    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (categoryId) whereClause.categoryId = categoryId;
    if (projectId) whereClause.projectId = projectId;
    if (courseId) whereClause.courseId = courseId;
    if (isInbox === "true") whereClause.isInbox = true;
    else if (isInbox === "false") whereClause.isInbox = false;

    // Busca textual por título, descrição, matéria acadêmica ou cliente
    if (search) {
      whereClause.AND = [
        {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { academicSubject: { contains: search } },
            { clientName: { contains: search } },
          ],
        },
      ];
    }

    // Filtros de janelas temporais
    if (timeFrame === "today") {
      whereClause.dueDate = { gte: startOfDay(now), lte: endOfDay(now) };
    } else if (timeFrame === "upcoming3") {
      whereClause.dueDate = { gte: startOfDay(now), lte: endOfDay(addDays(now, 3)) };
    } else if (timeFrame === "upcoming7") {
      whereClause.dueDate = { gte: startOfDay(now), lte: endOfDay(addDays(now, 7)) };
    } else if (timeFrame === "upcoming30") {
      whereClause.dueDate = { gte: startOfDay(now), lte: endOfDay(addDays(now, 30)) };
    } else if (timeFrame === "overdue") {
      whereClause.dueDate = { lt: startOfDay(now) };
      whereClause.status = { in: ["PENDING", "IN_PROGRESS"] };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        category: true,
        project: true,
        course: true,
        book: true,
        financialReminder: true,
        subtasks: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar tarefas." }, { status: 500 });
  }
}

/**
 * POST /api/tasks
 * Cadastra uma nova tarefa vinculada ao usuário autenticado com suporte a subtarefas.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      priority = "MEDIUM",
      status = "PENDING",
      categoryId,
      projectId,
      courseId,
      bookId,
      financialReminderId,
      startDate,
      dueDate,
      dueTime,
      isRecurring = false,
      recurrenceRule,
      recurrenceInterval = 1,
      tags,
      notes,
      attachments,
      clientName,
      clientValue,
      academicSubject,
      isInbox = false,
      subtasks = [],
    } = body;

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "O título da tarefa é obrigatório." }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description ? description.trim() : null,
        priority,
        status,
        categoryId: categoryId || null,
        projectId: projectId || null,
        courseId: courseId || null,
        bookId: bookId || null,
        financialReminderId: financialReminderId || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime: dueTime || null,
        isRecurring: Boolean(isRecurring),
        recurrenceRule: recurrenceRule || null,
        recurrenceInterval: recurrenceInterval || 1,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : tags || null,
        notes: notes || null,
        attachments: Array.isArray(attachments) ? JSON.stringify(attachments) : attachments || null,
        clientName: clientName || null,
        clientValue: clientValue ? parseFloat(clientValue) : null,
        academicSubject: academicSubject || null,
        isInbox: Boolean(isInbox),
        subtasks: {
          create: Array.isArray(subtasks)
            ? subtasks.map((st: any, idx: number) => ({
                title: st.title,
                isCompleted: Boolean(st.isCompleted),
                sortOrder: idx + 1,
              }))
            : [],
        },
      },
      include: {
        category: true,
        project: true,
        course: true,
        subtasks: true,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao criar tarefa." }, { status: 500 });
  }
}
