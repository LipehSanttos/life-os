import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addMonths, addWeeks, addYears } from "date-fns";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.financialReminder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lembrete financeiro não encontrado." }, { status: 404 });
    }

    const { title, description, amount, type, dueDate, status, isRecurring, recurrenceRule, recurrenceDay, recipient, proofUrl, notes, categoryId } = body;

    let updatedDueDate = dueDate ? new Date(dueDate) : existing.dueDate;
    let newStatus = status || existing.status;

    // If marked as PAID and is recurring, advance to next cycle
    if (status === "PAID" && existing.status !== "PAID" && existing.isRecurring) {
      let nextDate = new Date(existing.dueDate);
      if (existing.recurrenceRule === "MONTHLY") {
        nextDate = addMonths(nextDate, 1);
      } else if (existing.recurrenceRule === "WEEKLY") {
        nextDate = addWeeks(nextDate, 1);
      } else if (existing.recurrenceRule === "YEARLY") {
        nextDate = addYears(nextDate, 1);
      }
      updatedDueDate = nextDate;
      newStatus = "PENDING";
    }

    const updated = await prisma.financialReminder.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        description: description !== undefined ? description : existing.description,
        amount: amount !== undefined ? (amount !== null ? parseFloat(amount) : 0) : existing.amount,
        type: type !== undefined ? type : existing.type,
        dueDate: updatedDueDate,
        status: newStatus,
        isRecurring: isRecurring !== undefined ? Boolean(isRecurring) : existing.isRecurring,
        recurrenceRule: recurrenceRule !== undefined ? recurrenceRule : existing.recurrenceRule,
        recurrenceDay: recurrenceDay !== undefined ? (recurrenceDay ? parseInt(recurrenceDay) : null) : existing.recurrenceDay,
        recipient: recipient !== undefined ? recipient : existing.recipient,
        proofUrl: proofUrl !== undefined ? proofUrl : existing.proofUrl,
        notes: notes !== undefined ? notes : existing.notes,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
      },
      include: { category: true },
    });

    if (status) {
      await prisma.task.updateMany({
        where: { financialReminderId: id, userId: user.id },
        data: {
          status: status === "PAID" ? "COMPLETED" : "PENDING",
          completedAt: status === "PAID" ? new Date() : null,
          dueDate: updatedDueDate,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar lembrete financeiro." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { id } = await params;
    await prisma.financialReminder.deleteMany({
      where: { id, userId: user.id },
    });
    return NextResponse.json({ success: true, message: "Conta excluída com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao excluir lembrete financeiro." }, { status: 500 });
  }
}
