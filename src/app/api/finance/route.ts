import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const reminders = await prisma.financialReminder.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { dueDate: "asc" },
    });

    const pendingTotal = reminders
      .filter((r) => r.status === "PENDING" || r.status === "OVERDUE")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const paidTotal = reminders
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return NextResponse.json({
      reminders,
      totalPending: pendingTotal,
      pendingTotal,
      totalPaid: paidTotal,
      paidTotal,
      summary: {
        pendingTotal,
        totalPending: pendingTotal,
        paidTotal,
        totalPaid: paidTotal,
        totalReminders: reminders.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar finanças." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { title, amount, dueDate, isRecurring = false, recurrenceRule, categoryId, recipient } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Título da conta é obrigatório." }, { status: 400 });
    }
    if (!dueDate) {
      return NextResponse.json({ error: "Data de vencimento é obrigatória." }, { status: 400 });
    }

    const reminder = await prisma.financialReminder.create({
      data: {
        userId: user.id,
        title: title.trim(),
        amount: amount !== undefined && amount !== null ? parseFloat(amount) : 0,
        dueDate: new Date(dueDate),
        status: "PENDING",
        isRecurring: Boolean(isRecurring),
        recurrenceRule: recurrenceRule || (isRecurring ? "MONTHLY" : null),
        categoryId: categoryId || null,
        recipient: recipient || null,
      },
      include: { category: true },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao cadastrar conta." }, { status: 500 });
  }
}
