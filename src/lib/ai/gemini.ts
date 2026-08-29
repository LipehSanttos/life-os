import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { processFallbackNLP, NLPResult } from "./fallback-nlp";
import { formatDate, formatCurrency } from "@/lib/utils";
import { extractCleanTaskTitleAndDescription } from "./sanitizer";

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

  // If no API key is provided, use fallback NLP engine
  if (!apiKey || apiKey.trim() === "") {
    return processFallbackNLP(prompt, userId);
  }

  try {
    const now = new Date();
    const todayStr = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    const timeStr = format(now, "HH:mm");

    // Fetch live user-isolated context from database
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

    // Build context summary for Gemini
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

🏷️ CATEGORIAS DISPONÍVEIS: ${categories.map((c) => c.name).join(", ")}.
------------------------------------------------------

REGRAS CRÍTICAS DE INTERPRETAÇÃO E AGENDAMENTO:

1. TÍTULO CURTO, LIMPO E CONCISO (MÁXIMO 4 A 6 PALAVRAS):
   - NUNCA use a mensagem inteira do usuário como título da tarefa!
   - NUNCA inclua datas, dias da semana, horários ou preâmbulos no título (ex: remova "Preciso", "Me lembra de", "na terça às 14h", "para tomar vacina").
   - Exemplos obrigatórios de títulos corretos:
     * Usuário: "Preciso levar o Rex ao veterinário na próxima terça-feira às 14h30 para tomar a vacina de raiva"
       -> Título: "Levar o Rex ao Veterinário"
       -> Descrição: "Vacina de raiva para o Rex"
     * Usuário: "Me lembra de entregar o trabalho de Banco de Dados na sexta às 23:59"
       -> Título: "Entregar Trabalho de Banco de Dados"
       -> Descrição: "Submissão do trabalho acadêmico de Banco de Dados"
     * Usuário: "Tenho reunião com o João amanhã cedo às 9h para alinhar o orçamento do novo site"
       -> Título: "Reunião com João - Orçamento Web"
       -> Descrição: "Alinhar orçamento do novo site com o cliente João"

2. CÁLCULO PRECISO DE DATA E HORÁRIO (A PARTIR DE HOJE: ${todayStr}):
   - Calcule a data ISO exata no formato ISO 8601 ("YYYY-MM-DDTHH:mm:ss.000Z").
   - Extraia o horário específico no formato "HH:mm" (ex: "14:30", "09:00", "23:59").

3. CLASSIFICAÇÃO AUTOMÁTICA DE CATEGORIA E PRIORIDADE:
   - Veterinário / Médico / Dentista / Saúde / Remédio -> Categoria: "Saúde", Prioridade: "HIGH"
   - Faculdade / Prova / TCC / Trabalho Acadêmico -> Categoria: "Faculdade", Prioridade: "HIGH"
   - Reunião / Cliente / Freelancer -> Categoria: "Freelance", Prioridade: "HIGH"
   - Mercado / Compras -> Categoria: "Compras"
   - Casa / Faxina -> Categoria: "Casa"
   - Contas / Boletos -> Categoria: "Finanças"

4. FORMATO DE RESPOSTA E EMISSÃO DA AÇÃO:
   - No texto, informe cordialmente o agendamento interpretado com título limpo, data e horário calculados, e pergunte se confirma.
   - Emita no final da mensagem o bloco exatamente no formato:
   [ACTION:{"type":"CREATE_TASK","title":"Título Curto e Limpo","summary":"Resumo com data e horário","payload":{"title":"Título Curto e Limpo","description":"Instruções detalhadas","categoryName":"Saúde|Faculdade|Trabalho|Freelance|Estudos|Compras|Casa|Finanças","priority":"HIGH|MEDIUM|LOW|URGENT","dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","dueTime":"HH:mm"}}]

5. CASO SEJA CONTA / FINANÇAS:
   [ACTION:{"type":"REGISTER_FINANCE","title":"Pagar Conta","summary":"Resumo financeiro","payload":{"title":"Nome da Conta","amount":120.0,"dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","isRecurring":true|false}}]

6. CASO SEJA LIVRO:
   [ACTION:{"type":"UPDATE_BOOK","title":"Atualizar Leitura","summary":"Avanço de leitura","payload":{"bookTitle":"Nome do Livro","currentPage":87}}]`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];
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
            temperature: 0.2,
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
      throw new Error("All Gemini candidate models failed to respond.");
    }

    // Check if Gemini returned an action block [ACTION:{...}]
    let actionData: any = null;
    let cleanReply = rawText;

    const actionMatch = rawText.match(/\[ACTION:(\{[\s\S]*?\})\]/);
    if (actionMatch && actionMatch[1]) {
      try {
        actionData = JSON.parse(actionMatch[1]);
        cleanReply = rawText.replace(/\[ACTION:\{[\s\S]*?\}\]/g, "").trim();

        // Enforce strict title sanitization on CREATE_TASK action
        if (actionData.type === "CREATE_TASK" && actionData.payload?.title) {
          const sanitized = extractCleanTaskTitleAndDescription(actionData.payload.title);
          actionData.payload.title = sanitized.cleanTitle;
          actionData.title = sanitized.cleanTitle;
          if (sanitized.description && !actionData.payload.description) {
            actionData.payload.description = sanitized.description;
          }
        }
      } catch (err) {
        console.error("Failed to parse Gemini action JSON:", err);
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
