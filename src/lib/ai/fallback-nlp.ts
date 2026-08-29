import { prisma } from "@/lib/db";
import { format, addDays, nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, setDate, setHours, setMinutes, isPast } from "date-fns";
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
    if (lower.includes("internet")) title = "Pagar internet fibra";
    else if (lower.includes("manuten")) title = "Manutenção do computador";
    else if (lower.includes("luz") || lower.includes("energia")) title = "Conta de energia elétrica";
    else if (lower.includes("cartão") || lower.includes("cartao")) title = "Fatura do cartão de crédito";

    const catFin = await prisma.category.findFirst({ where: { slug: "financas" } });

    return {
      reply: `Identifiquei sua solicitação de pagamento para **"${title}"** no valor de **${formatCurrency(amount)}** com vencimento para o dia **${day}**${isRecurring ? " (Recorrente mensal)" : ""}. Deseja confirmar o cadastro no controle financeiro?`,
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

  // 5. ACTION: Interpretação Semântica e Criação de Tarefas / Eventos
  let targetDate = addDays(now, 1);
  let dueTime = "09:00";
  let catSlug = "outros";
  let priority = "MEDIUM";
  let description = "";

  // 5.1 Extração Cronológica de Horário
  const timeMatch =
    text.match(/(\d{1,2})[h:](\d{2})/i) ||
    text.match(/às\s*(\d{1,2})\s*h/i) ||
    text.match(/(\d{1,2})\s*horas/i);

  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    dueTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  } else if (lower.includes("tarde") || lower.includes("à tarde")) {
    dueTime = "14:30";
  } else if (lower.includes("noite") || lower.includes("à noite")) {
    dueTime = "20:00";
  } else if (lower.includes("manhã") || lower.includes("de manhã")) {
    dueTime = "09:00";
  }

  // 5.2 Extração Cronológica de Data
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
  } else {
    const dayExplicit = text.match(/dia\s*(\d{1,2})/i);
    if (dayExplicit) {
      targetDate = setDate(now, parseInt(dayExplicit[1], 10));
      if (isPast(targetDate) && targetDate.getDate() < now.getDate()) {
        targetDate = addDays(targetDate, 30);
      }
    }
  }

  // 5.3 Classificação Semântica de Categoria & Natureza da Solicitação
  if (lower.includes("veterinár") || lower.includes("veterinar") || lower.includes("médic") || lower.includes("medic") || lower.includes("dentista") || lower.includes("vacina") || lower.includes("remédio") || lower.includes("remedio") || lower.includes("exame") || lower.includes("consulta")) {
    catSlug = "saude";
    priority = "HIGH";
    description = "Compromisso de saúde/consulta.";
  } else if (lower.includes("faculdade") || lower.includes("prova") || lower.includes("tcc") || lower.includes("banco de dados") || lower.includes("trabalho de")) {
    catSlug = "faculdade";
    priority = "HIGH";
    description = "Atividade acadêmica/faculdade.";
  } else if (lower.includes("cliente") || lower.includes("orçamento") || lower.includes("orcamento") || lower.includes("proposta") || lower.includes("joão") || lower.includes("joao")) {
    catSlug = "freelance";
    priority = "HIGH";
    description = "Alinhamento com cliente / projeto freelance.";
  } else if (lower.includes("curso") || lower.includes("módulo") || lower.includes("modulo") || lower.includes("aula") || lower.includes("estudar")) {
    catSlug = "estudos";
    description = "Estudo e aprimoramento profissional.";
  } else if (lower.includes("comprar") || lower.includes("mercado") || lower.includes("supermercado") || lower.includes("shopping") || lower.includes("farmácia")) {
    catSlug = "compras";
    description = "Lista de compras e suprimentos.";
  } else if (lower.includes("casa") || lower.includes("limpar") || lower.includes("faxina") || lower.includes("conserto") || lower.includes("lavar")) {
    catSlug = "casa";
    description = "Organização e manutenção doméstica.";
  }

  // 5.4 Limpeza e Geração de Título Inteligente (Sem copiar o texto cru)
  let cleanTitle = text
    .replace(/^(preciso|tenho que|me lembra de|me lembre de|lembrar de|lembrete de|agendar|agende|marca|marcar|quero que você agende|adiciona uma tarefa para|adicionar uma tarefa para|cria uma tarefa para|criar uma tarefa para|adicionar|cria|criar|anota aí|anotar|não posso esquecer de|coloque na agenda)\s+/i, "")
    .replace(/(na próxima|na proxima|no próximo|no proximo|nesta|neste)\s+(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|semana)/gi, "")
    .replace(/(às|as)\s*\d{1,2}[h:]\d{0,2}/gi, "")
    .replace(/\b\d{1,2}\s*horas\b/gi, "")
    .replace(/\b(amanhã|amanha|hoje|depois de amanhã|depois de amanha|cedo|à tarde|à noite|de manhã)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanTitle.length > 0) {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  } else {
    cleanTitle = "Nova Atividade";
  }

  const category = await prisma.category.findFirst({ where: { slug: catSlug } });
  const formattedDate = formatDate(targetDate);

  return {
    reply: `Entendi a sua solicitação! Interpretei e preparei a tarefa **"${cleanTitle}"** (${category?.name || "Geral"}) para **${formattedDate}** às **${dueTime}**.\n\nConfirme abaixo para registrar no sistema e adicionar ao seu **Google Agenda**:`,
    action: {
      type: "CREATE_TASK",
      title: cleanTitle,
      summary: `${cleanTitle} (Categoria: ${category?.name || "Geral"} | Data: ${formattedDate} às ${dueTime} | Prioridade: ${priority})`,
      payload: {
        title: cleanTitle,
        description,
        categoryId: category?.id,
        categoryName: category?.name,
        priority,
        dueDate: targetDate.toISOString(),
        dueTime,
      },
    },
  };
}
