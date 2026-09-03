import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const userFilter = { userId: user.id };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // 1. Busca tarefas de aniversários
    const birthdayTasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        OR: [
          { category: { slug: "aniversarios" } },
          { category: { name: { contains: "Aniversár" } } },
          { title: { contains: "Aniversário" } },
          { title: { contains: "Aniversario" } },
          { title: { contains: "Niver" } },
          { title: { contains: "niver" } },
        ],
      },
      include: { category: true },
    });

    const upcomingBirthdays: any[] = [];

    for (const bTask of birthdayTasks) {
      if (!bTask.dueDate) continue;
      const due = new Date(bTask.dueDate);
      const birthMonth = due.getMonth();
      const birthDay = due.getDate();

      // Aniversário no ano corrente
      let targetDate = new Date(now.getFullYear(), birthMonth, birthDay, 0, 0, 0);

      // Se já passou há mais de 1 dia no ano atual, calcula para o próximo ano
      const diffTime = targetDate.getTime() - todayStart.getTime();
      let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        targetDate = new Date(now.getFullYear() + 1, birthMonth, birthDay, 0, 0, 0);
        const nextDiffTime = targetDate.getTime() - todayStart.getTime();
        diffDays = Math.round(nextDiffTime / (1000 * 60 * 60 * 24));
      }

      // Notifica se for Hoje ou nos próximos 15 dias
      if (diffDays >= 0 && diffDays <= 15) {
        const formattedDate = format(new Date(now.getFullYear(), birthMonth, birthDay), "dd 'de' MMMM", {
          locale: ptBR,
        });

        let statusText = `em ${diffDays} dias`;
        if (diffDays === 0) statusText = "É Hoje! 🎉";
        else if (diffDays === 1) statusText = "É Amanhã! 🎁";

        upcomingBirthdays.push({
          id: bTask.id,
          title: bTask.title,
          description: bTask.description,
          formattedDate,
          daysUntil: diffDays,
          statusText,
          isToday: diffDays === 0,
          isTomorrow: diffDays === 1,
        });
      }
    }

    // Ordena por proximidade (Hoje primeiro)
    upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);

    // 2. Busca tarefas atrasadas normais (excluindo aniversários)
    const overdueTasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        dueDate: { lt: todayStart },
        status: { in: ["PENDING", "IN_PROGRESS"] },
        NOT: {
          OR: [
            { category: { slug: "aniversarios" } },
            { title: { contains: "Aniversário" } },
            { title: { contains: "Aniversario" } },
          ],
        },
      },
      include: { category: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // 3. Busca contas com vencimento pendente próximo ou atrasado
    const nextThreeDays = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000);
    const bills = await prisma.financialReminder.findMany({
      where: {
        ...userFilter,
        dueDate: { lte: nextThreeDays },
        status: "PENDING",
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    const totalCount = upcomingBirthdays.length + overdueTasks.length + bills.length;

    return NextResponse.json({
      totalCount,
      birthdays: upcomingBirthdays,
      overdueTasks,
      bills,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar notificações." }, { status: 500 });
  }
}

