import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        project: true,
        course: true,
        book: true,
        financialReminder: true,
        subtasks: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar tarefa." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const existing = await prisma.task.findUnique({
      where: { id: params.id },
      include: { subtasks: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }

    const {
      title,
      description,
      priority,
      status,
      categoryId,
      projectId,
      courseId,
      bookId,
      financialReminderId,
      startDate,
      dueDate,
      dueTime,
      isRecurring,
      recurrenceRule,
      recurrenceInterval,
      tags,
      notes,
      attachments,
      clientName,
      clientValue,
      academicSubject,
      isInbox,
      subtasks,
    } = body;

    let updatedDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate;
    let newStatus = status || existing.status;
    let completedAt = existing.completedAt;

    // Check if task is being completed and is recurring
    if (status === "COMPLETED" && existing.status !== "COMPLETED") {
      completedAt = new Date();

      if (existing.isRecurring && existing.dueDate) {
        const interval = existing.recurrenceInterval || 1;
        let nextDate = new Date(existing.dueDate);

        switch (existing.recurrenceRule) {
          case "DAILY":
            nextDate = addDays(nextDate, interval);
            break;
          case "WEEKLY":
            nextDate = addWeeks(nextDate, interval);
            break;
          case "MONTHLY":
            nextDate = addMonths(nextDate, interval);
            break;
          case "ANNUAL":
            nextDate = addYears(nextDate, interval);
            break;
          default:
            nextDate = addMonths(nextDate, 1);
        }

        updatedDueDate = nextDate;
        newStatus = "PENDING";
        completedAt = null;
      }
    } else if (status && status !== "COMPLETED") {
      completedAt = null;
    }

    // Update subtasks if provided
    if (Array.isArray(subtasks)) {
      await prisma.subtask.deleteMany({ where: { taskId: params.id } });
      if (subtasks.length > 0) {
        await prisma.subtask.createMany({
          data: subtasks.map((st: any, idx: number) => ({
            taskId: params.id,
            title: st.title,
            isCompleted: Boolean(st.isCompleted),
            sortOrder: idx + 1,
          })),
        });
      }
    }

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        priority: priority !== undefined ? priority : existing.priority,
        status: newStatus,
        completedAt,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
        projectId: projectId !== undefined ? projectId : existing.projectId,
        courseId: courseId !== undefined ? courseId : existing.courseId,
        bookId: bookId !== undefined ? bookId : existing.bookId,
        financialReminderId: financialReminderId !== undefined ? financialReminderId : existing.financialReminderId,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : existing.startDate,
        dueDate: updatedDueDate,
        dueTime: dueTime !== undefined ? dueTime : existing.dueTime,
        isRecurring: isRecurring !== undefined ? Boolean(isRecurring) : existing.isRecurring,
        recurrenceRule: recurrenceRule !== undefined ? recurrenceRule : existing.recurrenceRule,
        recurrenceInterval: recurrenceInterval !== undefined ? recurrenceInterval : existing.recurrenceInterval,
        tags: tags !== undefined ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : existing.tags,
        notes: notes !== undefined ? notes : existing.notes,
        attachments: attachments !== undefined ? (Array.isArray(attachments) ? JSON.stringify(attachments) : attachments) : existing.attachments,
        clientName: clientName !== undefined ? clientName : existing.clientName,
        clientValue: clientValue !== undefined ? (clientValue ? parseFloat(clientValue) : null) : existing.clientValue,
        academicSubject: academicSubject !== undefined ? academicSubject : existing.academicSubject,
        isInbox: isInbox !== undefined ? Boolean(isInbox) : existing.isInbox,
      },
      include: {
        category: true,
        project: true,
        course: true,
        book: true,
        financialReminder: true,
        subtasks: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar tarefa." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao excluir tarefa." }, { status: 500 });
  }
}
