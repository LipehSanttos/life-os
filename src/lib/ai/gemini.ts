import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { processFallbackNLP, NLPResult } from "./fallback-nlp";
import { formatDate, formatCurrency } from "@/lib/utils";

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

    const systemInstruction = `Você é o Assistente Pessoal de Inteligência Artificial do Life OS do usuário ${userName}.
Hoje é ${todayStr}, exatamente ${timeStr}.
Seu objetivo é atuar como uma central de suporte pessoal, organizacional, profissional, acadêmica e financeira para o usuário, reduzindo ao máximo sua sobrecarga mental.

--- CONTEXTO COMPLETO ATUAL DO LIFE OS DO USUÁRIO ---
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

REGRAS DE CONDUTA E AGENDAMENTO:
1. Responda sempre em português brasileiro de forma acolhedora, objetiva, concisa e altamente prestativa.
2. Use os dados acima para responder perguntas com precisão máxima (ex: o que está atrasado, quais tarefas são para hoje, status dos cursos ou contas).
3. AGENDAMENTO DE TAREFAS / EVENTOS:
   - Quando o usuário pedir para criar, agendar ou registrar uma tarefa/compromisso:
     a) Calcule a data ISO exata a partir da data de hoje (${todayStr}).
     b) Na sua resposta de texto, informe o agendamento sugerido e pergunte se o usuário confirma a data e se gostaria de sincronizar o evento com o Google Agenda.
     c) Emita ao final da sua resposta a tag de ação estruturada exatamente no formato:
     [ACTION:{"type":"CREATE_TASK","title":"Nome da Tarefa","summary":"Resumo claro com data e prioridade","payload":{"title":"Nome da Tarefa","dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","dueTime":"15:00","priority":"HIGH|MEDIUM|LOW|URGENT"}}]
4. REGISTRO DE CONTAS A PAGAR:
   - Quando o usuário pedir para cadastrar uma conta a pagar, emita:
     [ACTION:{"type":"REGISTER_FINANCE","title":"Pagar conta","summary":"Resumo com valor e vencimento","payload":{"title":"Nome da conta","amount":120.0,"dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","isRecurring":true|false}}]
5. ATUALIZAÇÃO DE LEITURA:
   - Quando o usuário informar progresso em um livro:
     [ACTION:{"type":"UPDATE_BOOK","title":"Atualizar Leitura","summary":"Avanço de páginas","payload":{"bookTitle":"Nome do Livro","currentPage":87}}]`;

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-3.6-flash with fallback to gemini-3.5-flash
    let model;
    try {
      model = genAI.getGenerativeModel({
        model: "gemini-3.6-flash",
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1000,
        },
      });
    } catch {
      model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1000,
        },
      });
    }

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: `Entendido! Sou o Assistente Life OS do ${userName} conectado ao Gemini e estou pronto para gerenciar todas as suas atividades.` }] },
        ...history.slice(-8).map((h) => ({
          role: h.role === "assistant" ? ("model" as const) : ("user" as const),
          parts: [{ text: h.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(prompt);
    const rawText = result.response.text();

    // Check if Gemini returned an action block [ACTION:{...}]
    let actionData: any = null;
    let cleanReply = rawText;

    const actionMatch = rawText.match(/\[ACTION:(\{[\s\S]*?\})\]/);
    if (actionMatch && actionMatch[1]) {
      try {
        actionData = JSON.parse(actionMatch[1]);
        cleanReply = rawText.replace(/\[ACTION:\{[\s\S]*?\}\]/g, "").trim();
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
