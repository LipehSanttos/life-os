/**
 * @file fallback-nlp.ts
 * @description Motor local determinístico de Processamento de Linguagem Natural (NLP) para o Life OS.
 * Fornece interpretação semântica profunda de solicitações, respostas a consultas de status/atraso
 * e agendamento de tarefas com fidelidade estrita aos valores digitados (NUNCA inventa valores).
 */

import { prisma } from "@/lib/db";
import {
  format,
  addDays,
  nextSunday,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  setDate,
  isPast,
} from "date-fns";
import { formatDate, formatCurrency } from "@/lib/utils";
import { extractCleanTaskTitleAndDescription, extractMonetaryValue, extractPageNumber } from "./sanitizer";

export interface NLPResult {
  reply: string;
  action?: {
    type:
      | "CREATE_TASK"
      | "UPDATE_TASK"
      | "DELETE_TASK"
      | "CREATE_PROJECT"
      | "CREATE_COURSE"
      | "UPDATE_BOOK"
      | "REGISTER_FINANCE";
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

  // 1. CONSULTA: O que está atrasado ou vencido?
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
        reply += `- **${t.title}** (${t.category?.name || "Sem categoria"}) - Prazo: ${formatDate(t.dueDate)}${t.dueTime ? ` às ${t.dueTime}` : ""}\n`;
      });
    }

    if (overdueBills.length > 0) {
      reply += `\n💰 **Contas Vencidas (${overdueBills.length}):**\n`;
      overdueBills.forEach((b) => {
        reply += `- **${b.title}**${b.amount ? `: ${formatCurrency(b.amount)}` : ""} - Vencimento: ${formatDate(b.dueDate)}\n`;
      });
    }

    return { reply };
  }

  // 2. CONSULTA: O que tenho para Hoje?
  if (
    lower.includes("hoje") &&
    (lower.includes("tarefa") ||
      lower.includes("fazer") ||
      lower.includes("tenho") ||
      lower.includes("compromisso") ||
      lower.includes("agenda") ||
      lower.includes("atividades"))
  ) {
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
        reply: "☀️ Você **não possui tarefas pendentes para hoje**. Deseja que eu agende alguma atividade?",
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
        reply += `- **${b.title}**${b.amount ? `: ${formatCurrency(b.amount)}` : ""}\n`;
      });
    }
    return { reply };
  }

  // 3. AÇÃO: Atualização de Leitura de Livro (fiel à página informada)
  if (lower.includes("lendo") || (lower.includes("livro") && (lower.includes("página") || lower.includes("pagina") || lower.includes("pág")))) {
    const page = extractPageNumber(text);
    const books = await prisma.book.findMany({ where: userFilter });
    let targetBook = books.find((b) => lower.includes(b.title.toLowerCase()));
    const bookTitle = targetBook ? targetBook.title : "Livro em Leitura";
    const finalPage = page !== undefined ? page : (targetBook?.currentPage || 1);

    return {
      reply: `Identifiquei o registro de leitura do livro **"${bookTitle}"** na página **${finalPage}**. Deseja atualizar o progresso na sua biblioteca?`,
      action: {
        type: "UPDATE_BOOK",
        title: `Atualizar leitura: ${bookTitle}`,
        summary: `Atualizar livro "${bookTitle}" para a página ${finalPage}.`,
        payload: {
          bookId: targetBook?.id,
          bookTitle,
          currentPage: finalPage,
        },
      },
    };
  }

  // 4. AÇÃO: Contas & Finanças (extrai valor exato, sem valores aleatórios)
  if (lower.includes("pagar") || lower.includes("fatura") || lower.includes("reais") || lower.includes("r$") || lower.includes("boleto")) {
    const extractedAmount = extractMonetaryValue(text);
    const dayMatch = text.match(/dia\s*(\d{1,2})/i);
    const isRecurring = lower.includes("todo dia") || lower.includes("mensal") || lower.includes("recorrente");

    const day = dayMatch ? parseInt(dayMatch[1], 10) : now.getDate();

    let targetDate = setDate(now, day);
    if (isPast(targetDate)) {
      targetDate = addDays(targetDate, 30);
    }

    let title = "Pagar conta";
    if (lower.includes("internet")) title = "Pagar Internet";
    else if (lower.includes("manuten")) title = "Manutenção do Computador";
    else if (lower.includes("luz") || lower.includes("energia")) title = "Conta de Luz";
    else if (lower.includes("cartão") || lower.includes("cartao")) title = "Fatura do Cartão";
    else if (lower.includes("aluguel")) title = "Aluguel";
    else if (lower.includes("academia")) title = "Mensalidade da Academia";

    const catFin = await prisma.category.findFirst({ where: { slug: "financas" } });

    const valorText = extractedAmount ? ` no valor de **${formatCurrency(extractedAmount)}**` : "";
    const summaryValorText = extractedAmount ? ` - ${formatCurrency(extractedAmount)}` : "";

    return {
      reply: `Preparei o lembrete financeiro para **"${title}"**${valorText} para o dia **${day}**${isRecurring ? " (Recorrente)" : ""}.\n\nConfirme o registro no cartão abaixo:`,
      action: {
        type: "REGISTER_FINANCE",
        title,
        summary: `${title}${summaryValorText} (Vencimento: dia ${day}${isRecurring ? " - Recorrente" : ""})`,
        payload: {
          title,
          amount: extractedAmount ?? null,
          dueDate: targetDate.toISOString(),
          isRecurring,
          recurrenceRule: isRecurring ? "MONTHLY" : null,
          recurrenceDay: day,
          categoryId: catFin?.id,
        },
      },
    };
  }

  // 5. AÇÃO: Agendamento Inteligente de Tarefas com Título Limpo e Valores Reais
  const {
    cleanTitle,
    description,
    extractedTime,
    extractedAmount,
    extractedClientName,
    suggestedCategorySlug,
    suggestedPriority,
  } = extractCleanTaskTitleAndDescription(text);

  let targetDate = addDays(now, 1);
  const dueTime = extractedTime || "09:00";

  // Cálculo da Data
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

  // Parsing de datas explícitas com mês (ex: "dia 15 de outubro", "12/10", "25 de maio")
  const monthNames: Record<string, number> = {
    janeiro: 0, jan: 0,
    fevereiro: 1, fev: 1,
    março: 2, marco: 2, mar: 2,
    abril: 3, abr: 3,
    maio: 4, mai: 4,
    junho: 5, jun: 5,
    julho: 6, jul: 6,
    agosto: 7, ago: 7,
    setembro: 8, set: 8,
    outubro: 9, out: 9,
    novembro: 10, nov: 10,
    dezembro: 11, dez: 11,
  };

  const monthDateMatch = text.match(/(?:dia|no\s+dia|em)?\s*(\d{1,2})\s*(?:de|\/)\s*([a-zç]+|\d{1,2})/i);
  if (monthDateMatch) {
    const day = parseInt(monthDateMatch[1], 10);
    const monthRaw = monthDateMatch[2].toLowerCase();
    let monthIndex = -1;
    if (monthNames[monthRaw] !== undefined) {
      monthIndex = monthNames[monthRaw];
    } else if (!isNaN(parseInt(monthRaw, 10))) {
      monthIndex = parseInt(monthRaw, 10) - 1;
    }

    if (monthIndex >= 0 && monthIndex <= 11 && day >= 1 && day <= 31) {
      targetDate = new Date(now.getFullYear(), monthIndex, day, 0, 0, 0);
      if (isPast(targetDate) && suggestedCategorySlug === "aniversarios") {
        targetDate = new Date(now.getFullYear() + 1, monthIndex, day, 0, 0, 0);
      }
    }
  }

  const isBirthday = suggestedCategorySlug === "aniversarios";
  const isRecurring = isBirthday;
  const recurrenceRule = isBirthday ? "YEARLY" : null;

  const category = await prisma.category.findFirst({
    where: { slug: suggestedCategorySlug },
  });

  const formattedDate = formatDate(targetDate);
  const valorInfo = extractedAmount ? ` | Valor: ${formatCurrency(extractedAmount)}` : "";

  const replyPrefix = isBirthday
    ? `🎂 Que ótimo! Registrei o aniversário de **"${cleanTitle}"** para **${formattedDate}** (Lembrete Anual).`
    : `Entendido! Agendei a tarefa **"${cleanTitle}"** (${category?.name || "Geral"}) para **${formattedDate}** às **${dueTime}**${extractedAmount ? ` no valor de **${formatCurrency(extractedAmount)}**` : ""}.`;

  return {
    reply: `${replyPrefix}\n\nConfirme a atividade no cartão abaixo:`,
    action: {
      type: "CREATE_TASK",
      title: cleanTitle,
      summary: `${cleanTitle} (Data: ${formattedDate}${isBirthday ? "" : ` às ${dueTime}`} | Categoria: ${category?.name || "Aniversários"}${valorInfo})`,
      payload: {
        title: cleanTitle,
        description: description || null,
        categoryId: category?.id,
        categoryName: category?.name || (isBirthday ? "Aniversários" : "Geral"),
        priority: suggestedPriority,
        dueDate: targetDate.toISOString(),
        dueTime: isBirthday ? null : dueTime,
        isRecurring,
        recurrenceRule,
        clientName: extractedClientName || null,
        clientValue: extractedAmount ?? null,
      },
    },
  };
}
