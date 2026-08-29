import { prisma } from "@/lib/db";
import { format, addDays, nextSunday, setDate, isPast } from "date-fns";
import { formatDate, formatCurrency } from "@/lib/utils";

export interface NLPResult {
  reply: string;
  action?: {
    type: "CREATE_TASK" | "UPDATE_TASK" | "DELETE_TASK" | "CREATE_PROJECT" | "CREATE_COURSE" | "UPDATE_BOOK" | "REGISTER_FINANCE";
    title: string;
    summary: string;
    payload: Record<string, any>;
  };
}

export async function processFallbackNLP(prompt: string, userId?: string): Promise<NLPResult> {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const now = new Date();
  const userFilter = userId ? { userId } : {};

  // 1. QUERY: O que está atrasado?
  if (lower.includes("atrasad") || lower.includes("vencid")) {
    const overdueTasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        dueDate: { lt: now },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: { category: true },
      orderBy: { dueDate: "asc" },
    });

    const overdueBills = await prisma.financialReminder.findMany({
      where: {
        ...userFilter,
        dueDate: { lt: now },
        status: "PENDING",
      },
    });

    if (overdueTasks.length === 0 && overdueBills.length === 0) {
      return {
        reply: "🎉 Excelente notícia! Você **não tem nenhuma tarefa ou conta atrasada** no momento.",
      };
    }

    let reply = "⚠️ **Você possui itens atrasados:**\n\n";
    if (overdueTasks.length > 0) {
      reply += `📋 **Tarefas Atrasadas (${overdueTasks.length}):**\n`;
      overdueTasks.forEach((t) => {
        reply += `- **${t.title}** (${t.category?.name || "Sem categoria"}) - Prazo era: ${formatDate(t.dueDate)}\n`;
      });
    }

    if (overdueBills.length > 0) {
      reply += `\n💰 **Contas Vencidas (${overdueBills.length}):**\n`;
      overdueBills.forEach((b) => {
        reply += `- **${b.title}**: ${formatCurrency(b.amount)} - Venceu em: ${formatDate(b.dueDate)}\n`;
      });
    }

    return { reply };
  }

  // 2. QUERY: Hoje?
  if (lower.includes("hoje") && (lower.includes("tarefa") || lower.includes("fazer") || lower.includes("tenho") || lower.includes("compromisso"))) {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todayTasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        dueDate: { gte: startOfDay, lte: endOfDay },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    const todayBills = await prisma.financialReminder.findMany({
      where: {
        ...userFilter,
        dueDate: { gte: startOfDay, lte: endOfDay },
        status: "PENDING",
      },
    });

    if (todayTasks.length === 0 && todayBills.length === 0) {
      return {
        reply: "☀️ Você **não possui tarefas agendadas para hoje**. Deseja que eu adicione alguma atividade?",
      };
    }

    let reply = `📅 **Aqui está o seu planejamento para hoje (${format(now, "dd/MM/yyyy")}):**\n\n`;
    if (todayTasks.length > 0) {
      reply += "📋 **Tarefas de Hoje:**\n";
      todayTasks.forEach((t) => {
        reply += `- [ ] **${t.title}** [${t.priority}] ${t.dueTime ? `⏰ ${t.dueTime}` : ""}\n`;
      });
    }
    if (todayBills.length > 0) {
      reply += "\n💰 **Contas com Vencimento Hoje:**\n";
      todayBills.forEach((b) => {
        reply += `- **${b.title}**: ${formatCurrency(b.amount)}\n`;
      });
    }
    return { reply };
  }

  // 3. QUERY: Próximos dias / Semana?
  if (lower.includes("semana") || lower.includes("próximos dias") || lower.includes("proximos dias")) {
    const endOfWeek = addDays(now, 7);
    const weekTasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        dueDate: { gte: now, lte: endOfWeek },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: { category: true },
      orderBy: { dueDate: "asc" },
    });

    if (weekTasks.length === 0) {
      return {
        reply: "🗓️ Você não possui tarefas agendadas para os próximos 7 dias.",
      };
    }

    let reply = `🗓️ **Tarefas programadas para os próximos 7 dias (${weekTasks.length}):**\n\n`;
    weekTasks.forEach((t) => {
      reply += `- **${t.title}** (${t.category?.name || "Geral"}) ➔ *${formatDate(t.dueDate)}* [Prioridade: ${t.priority}]\n`;
    });
    return { reply };
  }

  // 4. ACTION: Livro (ex: "Estou lendo O Poder do Hábito e estou na página 87")
  if (lower.includes("lendo") || (lower.includes("livro") && lower.includes("página"))) {
    const pageMatch = text.match(/p[áa]gina\s*(\d+)/i) || text.match(/(\d+)\s*p[áa]g/i);
    const page = pageMatch ? parseInt(pageMatch[1], 10) : 1;

    const books = await prisma.book.findMany({ where: userFilter });
    let targetBook = books.find((b) => lower.includes(b.title.toLowerCase()));
    const bookTitle = targetBook ? targetBook.title : "O Poder do Hábito";

    return {
      reply: `Identifiquei sua leitura do livro **${bookTitle}** na página **${page}**. Deseja atualizar o progresso?`,
      action: {
        type: "UPDATE_BOOK",
        title: `Atualizar leitura: ${bookTitle}`,
        summary: `Atualizar livro "${bookTitle}" para a página ${page}.`,
        payload: {
          bookId: targetBook?.id,
          bookTitle,
          currentPage: page,
        },
      },
    };
  }

  // 5. ACTION: Concluir tarefa (ex: "Terminei o relatório")
  if (lower.includes("terminei") || lower.includes("conclui") || lower.includes("finalizei")) {
    const cleanTitle = text.replace(/^(terminei|conclui|concluí|finalizei|fiz a tarefa|fiz o|fiz a)\s*/i, "").trim();
    const tasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    const target = tasks.find((t) => t.title.toLowerCase().includes(cleanTitle.toLowerCase()) || cleanTitle.toLowerCase().includes(t.title.toLowerCase()));

    if (target) {
      return {
        reply: `Deseja marcar a tarefa **"${target.title}"** como concluída?`,
        action: {
          type: "UPDATE_TASK",
          title: `Concluir: ${target.title}`,
          summary: `Marcar a tarefa "${target.title}" como concluída.`,
          payload: {
            taskId: target.id,
            status: "COMPLETED",
          },
        },
      };
    }
  }

  // 6. ACTION: Finanças (ex: "Pagar a internet de 120 reais todo dia 10")
  if (lower.includes("pagar") || lower.includes("conta") || lower.includes("fatura") || lower.includes("reais") || lower.includes("r$")) {
    const amountMatch = text.match(/R\$\s*(\d+[.,]?\d*)/i) || text.match(/(\d+[.,]?\d*)\s*reais/i);
    const dayMatch = text.match(/dia\s*(\d{1,2})/i);
    const isRecurring = lower.includes("todo dia") || lower.includes("mensal") || lower.includes("recorrente");

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 120.0;
    const day = dayMatch ? parseInt(dayMatch[1], 10) : 10;

    let targetDate = setDate(now, day);
    if (isPast(targetDate)) {
      targetDate = addDays(targetDate, 30);
    }

    let title = "Pagar conta";
    if (lower.includes("internet")) title = "Pagar internet";
    else if (lower.includes("manuten")) title = "Pagar manutenção do computador";
    else if (lower.includes("luz") || lower.includes("energia")) title = "Pagar conta de luz";

    const catFin = await prisma.category.findFirst({ where: { slug: "financas" } });

    return {
      reply: `Entendi! Preparei o registro financeiro para **"${title}"**${amount ? ` no valor de ${formatCurrency(amount)}` : ""} para o dia **${day}**${isRecurring ? " (Recorrente mensal)" : ""}.`,
      action: {
        type: "REGISTER_FINANCE",
        title,
        summary: `${title} - ${formatCurrency(amount)} (Vencimento: dia ${day}${isRecurring ? " - Recorrente" : ""})`,
        payload: {
          title,
          amount,
          dueDate: targetDate.toISOString(),
          isRecurring,
          recurrenceRule: isRecurring ? "MONTHLY" : null,
          recurrenceDay: day,
          categoryId: catFin?.id,
        },
      },
    };
  }

  // 7. ACTION: Tarefa Geral / Faculdade / Estudos / Casa
  let catSlug = "outros";
  let priority = "MEDIUM";
  let dueDate = addDays(now, 1);
  let taskTitle = text.replace(/^(me lembra de|cria uma tarefa para|adiciona uma tarefa para|adicionar|cria|preciso|tenho que|tenho um trabalho de)\s*/i, "").trim();

  if (lower.includes("banco de dados") || lower.includes("faculdade") || lower.includes("trabalho de")) {
    catSlug = "faculdade";
    priority = "HIGH";
    const dayMatch = text.match(/dia\s*(\d{1,2})/i);
    if (dayMatch) dueDate = setDate(now, parseInt(dayMatch[1], 10));
  } else if (lower.includes("curso") || lower.includes("módulo") || lower.includes("modulo") || lower.includes("estudar")) {
    catSlug = "estudos";
    if (lower.includes("domingo")) dueDate = nextSunday(now);
  } else if (lower.includes("mesa") || lower.includes("casa") || lower.includes("limpar")) {
    catSlug = "casa";
    if (lower.includes("amanhã") || lower.includes("amanha")) dueDate = addDays(now, 1);
    else if (lower.includes("hoje")) dueDate = now;
  } else if (lower.includes("comprar") || lower.includes("cabo") || lower.includes("adaptador")) {
    catSlug = "compras";
  } else if (lower.includes("joão") || lower.includes("joao") || lower.includes("cliente")) {
    catSlug = "freelance";
    priority = "HIGH";
  }

  const category = await prisma.category.findFirst({ where: { slug: catSlug } });
  if (taskTitle.length > 0) {
    taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
  } else {
    taskTitle = "Nova Atividade";
  }

  return {
    reply: `Entendi! Deseja que eu agende a tarefa **"${taskTitle}"** para **${formatDate(dueDate)}**? Você pode confirmar a data e sincronizar o lembrete com o seu **Google Agenda** através do cartão abaixo:`,
    action: {
      type: "CREATE_TASK",
      title: `Agendar Tarefa: ${taskTitle}`,
      summary: `${taskTitle} (Categoria: ${category?.name || "Geral"} | Data: ${formatDate(dueDate)} | Prioridade: ${priority})`,
      payload: {
        title: taskTitle,
        categoryId: category?.id,
        priority,
        dueDate: dueDate.toISOString(),
      },
    },
  };
}
