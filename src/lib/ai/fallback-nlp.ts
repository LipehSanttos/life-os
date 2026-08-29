import { prisma } from "@/lib/db";
import { format, addDays, nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, setDate, isPast } from "date-fns";
import { formatDate, formatCurrency } from "@/lib/utils";
import { extractCleanTaskTitleAndDescription } from "./sanitizer";

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

    let reply = "⚠️ **Você possui itens que necessitam de atenção:**\n\n";
    if (overdueTasks.length > 0) {
      reply += `📋 **Tarefas Atrasadas (${overdueTasks.length}):**\n`;
      overdueTasks.forEach((t) => {
        reply += `- **${t.title}** (${t.category?.name || "Sem categoria"}) - Prazo original: ${formatDate(t.dueDate)}\n`;
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

  // 2. QUERY: O que tenho para Hoje?
  if (lower.includes("hoje") && (lower.includes("tarefa") || lower.includes("fazer") || lower.includes("tenho") || lower.includes("compromisso") || lower.includes("agenda"))) {
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
        reply: "☀️ Você **não possui tarefas agendadas para hoje**. Deseja que eu agende alguma atividade?",
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

  // 3. ACTION: Livro (ex: "Estou lendo O Poder do Hábito e estou na página 87")
  if (lower.includes("lendo") || (lower.includes("livro") && lower.includes("página"))) {
    const pageMatch = text.match(/p[áa]gina\s*(\d+)/i) || text.match(/(\d+)\s*p[áa]g/i);
    const page = pageMatch ? parseInt(pageMatch[1], 10) : 1;

    const books = await prisma.book.findMany({ where: userFilter });
    let targetBook = books.find((b) => lower.includes(b.title.toLowerCase()));
    const bookTitle = targetBook ? targetBook.title : "Livro em Leitura";

    return {
      reply: `Identifiquei o registro de leitura do livro **"${bookTitle}"** na página **${page}**. Deseja atualizar o progresso na sua biblioteca?`,
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

  // 4. ACTION: Finanças (ex: "Pagar a internet de 120 reais todo dia 10")
  if (lower.includes("pagar") || lower.includes("fatura") || lower.includes("reais") || lower.includes("r$")) {
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
    if (lower.includes("internet")) title = "Pagar Internet Fibra";
    else if (lower.includes("manuten")) title = "Manutenção do Computador";
    else if (lower.includes("luz") || lower.includes("energia")) title = "Conta de Luz";
    else if (lower.includes("cartão") || lower.includes("cartao")) title = "Fatura do Cartão";

    const catFin = await prisma.category.findFirst({ where: { slug: "financas" } });

    return {
      reply: `Preparei o pagamento de **"${title}"** no valor de **${formatCurrency(amount)}** para o dia **${day}**${isRecurring ? " (Recorrente)" : ""}.`,
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

  // 5. ACTION: Interpretação Semântica e Extração de Título Curto
  const { cleanTitle, description, extractedTime } = extractCleanTaskTitleAndDescription(text);

  let targetDate = addDays(now, 1);
  let dueTime = extractedTime || "09:00";
  let catSlug = "outros";
  let priority = "MEDIUM";

  // Extração de Data
  if (lower.includes("hoje")) {
    targetDate = now;
  } else if (lower.includes("amanhã") || lower.includes("amanha")) {
    targetDate = addDays(now, 1);
  } else if (lower.includes("depois de amanhã") || lower.includes("depois de amanha")) {
    targetDate = addDays(now, 2);
  } else if (lower.includes("segunda")) {
    targetDate = nextMonday(now);
  } else if (lower.includes("terça") || lower.includes("terca")) {
    targetDate = nextTuesday(now);
  } else if (lower.includes("quarta")) {
    targetDate = nextWednesday(now);
  } else if (lower.includes("quinta")) {
    targetDate = nextThursday(now);
  } else if (lower.includes("sexta")) {
    targetDate = nextFriday(now);
  } else if (lower.includes("sábado") || lower.includes("sabado")) {
    targetDate = nextSaturday(now);
  } else if (lower.includes("domingo")) {
    targetDate = nextSunday(now);
  }

  // Classificação de Categoria & Prioridade
  if (lower.includes("veterinár") || lower.includes("veterinar") || lower.includes("médic") || lower.includes("medic") || lower.includes("dentista") || lower.includes("vacina") || lower.includes("remédio") || lower.includes("remedio") || lower.includes("exame") || lower.includes("consulta")) {
    catSlug = "saude";
    priority = "HIGH";
  } else if (lower.includes("faculdade") || lower.includes("prova") || lower.includes("tcc") || lower.includes("banco de dados") || lower.includes("trabalho de")) {
    catSlug = "faculdade";
    priority = "HIGH";
  } else if (lower.includes("cliente") || lower.includes("orçamento") || lower.includes("orcamento") || lower.includes("proposta") || lower.includes("joão") || lower.includes("joao") || lower.includes("reunião") || lower.includes("reuniao")) {
    catSlug = "freelance";
    priority = "HIGH";
  } else if (lower.includes("curso") || lower.includes("módulo") || lower.includes("modulo") || lower.includes("aula") || lower.includes("estudar")) {
    catSlug = "estudos";
  } else if (lower.includes("comprar") || lower.includes("mercado") || lower.includes("supermercado") || lower.includes("shopping") || lower.includes("farmácia")) {
    catSlug = "compras";
  } else if (lower.includes("casa") || lower.includes("limpar") || lower.includes("faxina") || lower.includes("conserto") || lower.includes("lavar")) {
    catSlug = "casa";
  }

  const category = await prisma.category.findFirst({ where: { slug: catSlug } });
  const formattedDate = formatDate(targetDate);

  return {
    reply: `Entendido! Agendei a tarefa **"${cleanTitle}"** (${category?.name || "Geral"}) para **${formattedDate}** às **${dueTime}**.\n\nConfirme a data e sincronize com seu Google Agenda no cartão abaixo:`,
    action: {
      type: "CREATE_TASK",
      title: cleanTitle,
      summary: `${cleanTitle} (Data: ${formattedDate} às ${dueTime} | Categoria: ${category?.name || "Geral"})`,
      payload: {
        title: cleanTitle,
        description: description || null,
        categoryId: category?.id,
        categoryName: category?.name,
        priority,
        dueDate: targetDate.toISOString(),
        dueTime,
      },
    },
  };
}
