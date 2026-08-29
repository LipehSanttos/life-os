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

    const systemInstruction = `Você é a Inteligência Artificial central do Life OS de ${userName}.
Hoje é exatamente: ${todayStr}, horário atual: ${timeStr} (Horário de Brasília / UTC-3).
Seu objetivo é atuar como uma central de suporte pessoal, organizacional, profissional, acadêmica e financeira de alta precisão.

--- CONTEXTO ATUAL DO USUÁRIO NO SISTEMA ---
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

DIRETRIZES DE INTERPRETAÇÃO SEMÂNTICA E AGENDAMENTO INTELIGENTE:

1. NUNCA COPIE O TEXTO CRU DIGITADO PELO USUÁRIO COMO TÍTULO DA TAREFA:
   - Extraia a real intenção e essência da atividade.
   - Remova preâmbulos coloquiais como "preciso", "me lembra de", "tenho que", "anota aí", "agendar para mim", "não posso esquecer".
   - Crie um título profissional, claro e objetivo (ex: "Levar o Rex ao Veterinário", "Consulta com Dr. Marcos", "Entregar Trabalho de Banco de Dados", "Reunião de Orçamento com João").
   - Coloque detalhes adicionais, notas ou instruções no campo "description".

2. ANÁLISE DE TEMPO, DATA E HORÁRIO (CÁLCULO CRONOLÓGICO EXATO):
   - A partir de HOJE (${todayStr}, ${timeStr}), calcule a data exata no formato ISO 8601 (ex: "2026-09-01T14:30:00.000Z").
   - Interprete referências temporais em linguagem natural:
     * "amanhã", "depois de amanhã", "hoje às 20h"
     * Dias da semana: "na próxima terça", "nesta sexta-feira", "segunda que vem", "no sábado"
     * Horários: "às 14h30", "14:30", "às 9h", "9 da manhã", "no fim da tarde (17:00)", "à noite (20:00)", "às 23:59"
     * Se o usuário não especificar horário, sugira um horário padrão coerente (ex: 09:00 ou 14:00) e preencha "dueTime".

3. CLASSIFICAÇÃO AUTOMÁTICA DE CATEGORIA E PRIORIDADE:
   - Saúde / Médico / Dentista / Veterinário / Remédios / Exames ➔ Categoria: "Saúde", Prioridade: "HIGH"
   - Faculdade / Universidade / TCC / Prova / Seminário ➔ Categoria: "Faculdade", Prioridade: "HIGH" ou "URGENT"
   - Cursos / Programação / Aulas / Certificações ➔ Categoria: "Estudos"
   - Reuniões / Entregas / Trabalho corporativo ➔ Categoria: "Trabalho"
   - Clientes / Orçamentos / Freelancers ➔ Categoria: "Freelance", Prioridade: "HIGH"
   - Mercado / Farmácia / Compras ➔ Categoria: "Compras"
   - Faxina / Consertos / Casa ➔ Categoria: "Casa"
   - Pagamentos / Boletos / Faturas / Transferências ➔ Categoria: "Finanças"

4. FORMATO OBRIGATÓRIO DE EMISSÃO DA AÇÃO (JSON):
   - Na sua resposta textual, explique resumidamente o que foi interpretado e preparado (título limpo, data e horário calculados, categoria) e pergunte se o usuário confirma o agendamento e o lembrete no Google Agenda.
   - Emita no final da mensagem o bloco estruturado exatamente assim:
   [ACTION:{"type":"CREATE_TASK","title":"Título Limpo da Tarefa","summary":"Resumo claro com data, horário e prioridade","payload":{"title":"Título Limpo da Tarefa","description":"Detalhes e instruções complementares","categoryName":"Saúde|Faculdade|Trabalho|Freelance|Estudos|Finanças|Casa|Compras|Pessoal","priority":"LOW|MEDIUM|HIGH|URGENT","dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","dueTime":"HH:mm"}}]

5. CASO SEJA CONTA / FINANÇAS:
   [ACTION:{"type":"REGISTER_FINANCE","title":"Pagar Internet Fibra","summary":"Pagar Internet Fibra - R$ 120,00 (Vencimento: 10/09/2026)","payload":{"title":"Pagar Internet Fibra","amount":120.0,"dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","isRecurring":true|false,"recipient":"Provedor"}}]

6. CASO SEJA ATUALIZAÇÃO DE LIVRO:
   [ACTION:{"type":"UPDATE_BOOK","title":"Atualizar Leitura","summary":"Avanço de leitura","payload":{"bookTitle":"Nome do Livro","currentPage":87}}]`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];
    let rawText = "";

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        });

        const chat = model.startChat({
          history: [
            { role: "user", parts: [{ text: systemInstruction }] },
            { role: "model", parts: [{ text: `Compreendido com perfeição. Sou a IA do Life OS de ${userName}, pronta para interpretar o contexto real, calcular datas e horários com precisão cronológica e gerar títulos limpos e organizados.` }] },
            ...history.slice(-8).map((h) => ({
              role: h.role === "assistant" ? ("model" as const) : ("user" as const),
              parts: [{ text: h.content }],
            })),
          ],
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
