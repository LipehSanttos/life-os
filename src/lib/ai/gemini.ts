/**
 * @file gemini.ts
 * @description Módulo de integração com a Google Gemini API (modelos gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)
 * com fallback inteligente, fidelidade estrita aos valores monetários e numéricos informados na entrada.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { processFallbackNLP, NLPResult } from "./fallback-nlp";
import { formatDate, formatCurrency } from "@/lib/utils";
import { extractCleanTaskTitleAndDescription, extractMonetaryValue, extractPageNumber } from "./sanitizer";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function processAIChat(prompt: string, history: Message[] = [], userId?: string): Promise<NLPResult> {
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const userSettings = await prisma.userSettings.findUnique({
    where: { id: "user_default" },
  });

  const apiKey = process.env.GEMINI_API_KEY || userSettings?.geminiApiKey;

  // Se não possuir chave de API configurada, utiliza o motor determinístico local
  if (!apiKey || apiKey.trim() === "") {
    return processFallbackNLP(prompt, userId);
  }

  try {
    const now = new Date();
    const todayStr = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    const timeStr = format(now, "HH:mm");

    const userFilter = userId ? { userId } : {};

    const [categories, projects, courses, books, finances, tasks] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
      prisma.project.findMany({ where: { ...userFilter, status: { not: "ARCHIVED" } }, select: { id: true, name: true, progress: true, priority: true, dueDate: true } }),
      prisma.course.findMany({ where: userFilter, select: { id: true, name: true, currentModule: true, totalModules: true, progress: true, institution: true } }),
      prisma.book.findMany({ where: userFilter, select: { id: true, title: true, author: true, currentPage: true, totalPages: true, progress: true } }),
      prisma.financialReminder.findMany({ where: userFilter, select: { id: true, title: true, amount: true, dueDate: true, status: true, isRecurring: true } }),
      prisma.task.findMany({
        where: { ...userFilter, status: { in: ["PENDING", "IN_PROGRESS"] } },
        select: { id: true, title: true, priority: true, dueDate: true, dueTime: true, category: { select: { name: true } }, project: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 30,
      }),
    ]);

    const userName = user?.name || userSettings?.name || "Eduardo Felipe";

    const tasksContext = tasks.map((t) => {
      const due = t.dueDate ? format(new Date(t.dueDate), "dd/MM/yyyy") : "Sem data";
      return `- ${t.title} [Prioridade: ${t.priority}, Prazo: ${due}${t.dueTime ? ` às ${t.dueTime}` : ""}, Categoria: ${t.category?.name || "Geral"}]`;
    }).join("\n") || "Nenhuma tarefa pendente.";

    const projectsContext = projects.map((p) => `- ${p.name} (Progresso: ${p.progress}%, Prioridade: ${p.priority})`).join("\n") || "Nenhum projeto cadastrado.";
    const coursesContext = courses.map((c) => `- ${c.name}: Módulo ${c.currentModule}/${c.totalModules} (${c.progress}%)`).join("\n") || "Nenhum curso cadastrado.";
    const booksContext = books.map((b) => `- ${b.title} (${b.author || "Autor não informado"}): Página ${b.currentPage}/${b.totalPages} (${b.progress}%)`).join("\n") || "Nenhum livro em leitura.";
    const financesContext = finances.map((f) => `- ${f.title}: ${formatCurrency(f.amount)} (Vencimento: ${format(new Date(f.dueDate), "dd/MM/yyyy")}, Status: ${f.status})`).join("\n") || "Nenhuma conta registrada.";

    const systemInstruction = `Você é o Assistente Pessoal de Inteligência Artificial do Life OS de ${userName}.
Hoje é ${todayStr}, horário atual: ${timeStr} (Horário de Brasília / UTC-3).

--- CONTEXTO ATUAL DO USUÁRIO NO LIFE OS ---
📅 TAREFAS PENDENTES / EM ANDAMENTO:
${tasksContext}

📁 PROJETOS ATIVOS:
${projectsContext}

🎓 ESTUDOS E CURSOS:
${coursesContext}

📖 LEITURAS E LIVROS:
${booksContext}

💰 CONTAS E FINANÇAS:
${financesContext}

🏷️ CATEGORIAS DISPONÍVEIS NO SISTEMA: ${categories.map((c) => `${c.name} (${c.slug})`).join(", ")}.
------------------------------------------------------

REGRAS CRÍTICAS E OBRIGATÓRIAS:

1. REGRA ABSOLUTA SOBRE VALORES MONETÁRIOS E NUMÉRICOS:
   - NUNCA invente, presuma ou gere valores aleatórios (R$), páginas ou quantidades que o usuário NÃO tenha digitado explicitamente!
   - Se o usuário disse "Pagar conta de luz dia 10", o campo "amount" DEVE ser null (NUNCA coloque 120, 100 ou qualquer outro valor fictício).
   - Se o usuário disse "Pagar a internet de R$ 149,90 dia 10", o campo "amount" deve ser exatamente 149.90.
   - Se o usuário disse "Reunião com cliente João - projeto de 3500 reais", "clientName" deve ser "João" e "clientValue" deve ser 3500.0.
   - Se o usuário disse "Li o livro até a página 45", "currentPage" deve ser 45. Se não informou a página, não invente números.

2. O TÍTULO DA TAREFA DEVE SER LIMPO E DIRETO (2 A 5 PALAVRAS):
   - NUNCA inclua saudações ("Oi", "Olá", "Bom dia", "Boa tarde", "Boa noite", "Por favor", "Pfv").
   - NUNCA inclua pedidos ("Gostaria que agendasse", "Me lembre de", "Preciso que", "Favor marcar").
   - NUNCA inclua datas/horários ("amanhã", "terça", "às 8h", "às 14h30") nem valores monetários ("de 150 reais") no título da tarefa.
   - Exemplos de títulos limpos:
     * "Pagar a fatura do cartão de R$ 350 amanhã" -> Título: "Pagar Fatura do Cartão", Valor: 350.0
     * "Me lembre de comprar pão amanhã às 8h" -> Título: "Comprar Pão", Horário: "08:00"
     * "Levar o Rex ao veterinário na terça às 14:30" -> Título: "Levar o Rex ao Veterinário", Horário: "14:30"

3. CÁLCULO PRECISO DE DATAS E HORÁRIOS (A PARTIR DE HOJE: ${todayStr}):
   - Calcule a data ISO ("YYYY-MM-DDTHH:mm:ss.000Z") e o horário ("HH:mm").

4. FORMATO DE EMISSÃO DA AÇÃO NO FINAL DA RESPOSTA:
   - Para Tarefas:
   [ACTION:{"type":"CREATE_TASK","title":"Título Limpo","summary":"Título Limpo (Data: DD/MM/AAAA às HH:mm | Categoria: Categoria)","payload":{"title":"Título Limpo","description":"Notas se houver","categoryName":"Saúde|Faculdade|Trabalho|Freelance|Estudos|Compras|Casa|Finanças","priority":"HIGH|MEDIUM|LOW|URGENT","dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","dueTime":"HH:mm","clientName":null,"clientValue":null}}]

   - Para Finanças / Contas (somente com valor se o usuário informou):
   [ACTION:{"type":"REGISTER_FINANCE","title":"Nome da Conta","summary":"Resumo da Conta","payload":{"title":"Nome da Conta","amount":null,"dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","isRecurring":true|false}}]

   - Para Livros:
   [ACTION:{"type":"UPDATE_BOOK","title":"Atualizar Leitura","summary":"Avanço de leitura","payload":{"bookTitle":"Nome do Livro","currentPage":null}}]`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    let rawText = "";

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: {
            role: "system",
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          },
        });

        const chat = model.startChat({
          history: history.slice(-8).map((h) => ({
            role: h.role === "assistant" ? ("model" as const) : ("user" as const),
            parts: [{ text: h.content }],
          })),
        });

        const result = await chat.sendMessage(prompt);
        rawText = result.response.text();
        if (rawText && rawText.trim() !== "") {
          break;
        }
      } catch (mErr: any) {
        console.warn(`Model ${modelName} call failed, trying next candidate:`, mErr.message || mErr);
      }
    }

    if (!rawText) {
      throw new Error("Todos os modelos Gemini falharam em responder.");
    }

    let actionData: any = null;
    let cleanReply = rawText;

    const actionMatch = rawText.match(/\[ACTION:(\{[\s\S]*?\})\]/);
    if (actionMatch && actionMatch[1]) {
      try {
        actionData = JSON.parse(actionMatch[1]);
        cleanReply = rawText.replace(/\[ACTION:\{[\s\S]*?\}\]/g, "").trim();

        // Validação e higienização estrita de valores contra alucinação
        const promptAmount = extractMonetaryValue(prompt);
        const promptPages = extractPageNumber(prompt);

        if (actionData.type === "CREATE_TASK") {
          const rawTitle = actionData.payload?.title || actionData.title || prompt;
          const sanitized = extractCleanTaskTitleAndDescription(rawTitle);
          actionData.payload.title = sanitized.cleanTitle;
          actionData.title = sanitized.cleanTitle;

          if (sanitized.description && !actionData.payload.description) {
            actionData.payload.description = sanitized.description;
          }
          if (sanitized.extractedTime && !actionData.payload.dueTime) {
            actionData.payload.dueTime = sanitized.extractedTime;
          }

          // Atribuição fiel de valor monetário (nunca inventa se não estava no prompt)
          actionData.payload.clientValue = promptAmount ?? sanitized.extractedAmount ?? null;
          actionData.payload.clientName = sanitized.extractedClientName || actionData.payload.clientName || null;

          // Vincula categoria
          const catName = actionData.payload.categoryName || sanitized.suggestedCategorySlug;
          const matchedCategory = categories.find(
            (c) =>
              c.name.toLowerCase() === catName?.toLowerCase() ||
              c.slug.toLowerCase() === catName?.toLowerCase() ||
              c.slug.toLowerCase() === sanitized.suggestedCategorySlug
          );

          if (matchedCategory) {
            actionData.payload.categoryId = matchedCategory.id;
            actionData.payload.categoryName = matchedCategory.name;
          }

          const valorInfo = actionData.payload.clientValue ? ` | Valor: ${formatCurrency(actionData.payload.clientValue)}` : "";
          actionData.summary = `${sanitized.cleanTitle} (Data: ${actionData.payload.dueDate ? formatDate(actionData.payload.dueDate) : "Amanhã"}${actionData.payload.dueTime ? ` às ${actionData.payload.dueTime}` : ""} | Categoria: ${actionData.payload.categoryName || "Geral"}${valorInfo})`;
        } else if (actionData.type === "REGISTER_FINANCE") {
          // Garante que o valor venha exclusivamente da entrada do usuário
          actionData.payload.amount = promptAmount ?? (typeof actionData.payload.amount === "number" && actionData.payload.amount > 0 ? actionData.payload.amount : null);
          const valorTxt = actionData.payload.amount ? ` - ${formatCurrency(actionData.payload.amount)}` : "";
          actionData.summary = `${actionData.payload.title || actionData.title}${valorTxt} (Vencimento: ${actionData.payload.dueDate ? formatDate(actionData.payload.dueDate) : "A definir"})`;
        } else if (actionData.type === "UPDATE_BOOK") {
          if (promptPages !== undefined) {
            actionData.payload.currentPage = promptPages;
          }
        }
      } catch (err) {
        console.error("Falha ao analisar JSON de ação do Gemini:", err);
      }
    }

    if (!actionData) {
      const fallback = await processFallbackNLP(prompt, userId);
      if (fallback.action) {
        actionData = fallback.action;
      }
    }

    return {
      reply: cleanReply,
      action: actionData,
    };
  } catch (error: any) {
    console.error("Gemini API error, falling back to local NLP engine:", error.message || error);
    const fallback = await processFallbackNLP(prompt, userId);
    return fallback;
  }
}
