/**
 * @file gemini.ts
 * @description Módulo de integração com a Google Gemini API (modelos gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)
 * com fallback inteligente, injeção de contexto de dados isolados por usuário e higienização estrita de títulos.
 */

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

  // Se não possuir chave de API configurada, utiliza o motor determinístico local
  if (!apiKey || apiKey.trim() === "") {
    return processFallbackNLP(prompt, userId);
  }

  try {
    const now = new Date();
    const todayStr = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    const timeStr = format(now, "HH:mm");

    // Carrega o contexto em tempo real isolado por usuário
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

REGRAS CRÍTICAS E OBRIGATÓRIAS DE EXTRAÇÃO DE TÍTULO E AÇÃO:

1. O TÍTULO DA TAREFA DEVE SER LIMPO, DIRETO E CONCISO (2 A 5 PALAVRAS):
   - NUNCA inclua saudações ("Oi", "Olá", "Bom dia", "Boa tarde", "Boa noite", "Por favor", "Por gentileza", "Pfv").
   - NUNCA inclua pedidos de conversa ("Gostaria que agendasse", "Me lembre de", "Preciso que", "Favor marcar", "Cria uma tarefa de", "Anota aí").
   - NUNCA coloque no título referências temporais ("amanhã", "terça-feira", "às 8h", "às 14h30", "de manhã").
   - Exemplos obrigatórios de títulos perfeitos:
     * Usuário: "Oi bom dia, gostaria que agendasse uma reunião com a equipe amanhã às 14h para alinhar metas"
       -> Título: "Reunião com a Equipe"
       -> Descrição: "Alinhar metas com a equipe"
       -> Horário: "14:00"
       -> Categoria: "Trabalho" ou "Freelance"
     * Usuário: "Por favor me lembre de comprar ração pro cachorro no pet shop hoje às 18h"
       -> Título: "Comprar Ração no Pet Shop"
       -> Horário: "18:00"
       -> Categoria: "Compras" ou "Saúde"
     * Usuário: "Preciso levar o Rex ao veterinário na próxima terça-feira às 14h30 para tomar a vacina de raiva"
       -> Título: "Levar o Rex ao Veterinário"
       -> Descrição: "Vacina de raiva para o Rex"
       -> Horário: "14:30"
       -> Categoria: "Saúde"
     * Usuário: "Gostaria de marcar entrega do trabalho de Banco de Dados na sexta às 23:59"
       -> Título: "Entregar Trabalho de Banco de Dados"
       -> Horário: "23:59"
       -> Categoria: "Faculdade"

2. CÁLCULO PRECISO DE DATAS E HORÁRIOS:
   - "hoje" = data atual (${todayStr})
   - "amanhã" = data de amanhã
   - "segunda", "terça", "quarta", etc. = próximo dia da semana correspondente
   - Calcule a data no formato ISO 8601 ("YYYY-MM-DDTHH:mm:ss.000Z") e o horário no formato "HH:mm".

3. CLASSIFICAÇÃO DE CATEGORIA:
   - Saúde, Médico, Dentista, Vacina, Remédio, Veterinário -> "Saúde"
   - Faculdade, Prova, TCC, Disciplina, Estudo Universitário -> "Faculdade"
   - Reunião, Cliente, Trabalho, Projeto, Freelance -> "Freelance" ou "Trabalho"
   - Mercado, Compras, Padaria, Farmácia -> "Compras"
   - Casa, Limpeza, Faxina, Manutenção -> "Casa"
   - Contas, Fatura, Boleto, Dinheiro -> "Finanças"

4. FORMATO DE EMISSÃO DA AÇÃO NO FINAL DA RESPOSTA:
   - Responda cordialmente em português, confirmando a atividade.
   - Emita no final da mensagem a tag no formato:
   [ACTION:{"type":"CREATE_TASK","title":"Título Curto e Limpo","summary":"Título Curto e Limpo (Data: DD/MM/AAAA às HH:mm | Categoria: CategoriaEscolhida)","payload":{"title":"Título Curto e Limpo","description":"Detalhes se houver","categoryName":"Saúde|Faculdade|Trabalho|Freelance|Estudos|Compras|Casa|Finanças","priority":"HIGH|MEDIUM|LOW|URGENT","dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","dueTime":"HH:mm"}}]

5. CASO SEJA CONTA / FINANÇAS:
   [ACTION:{"type":"REGISTER_FINANCE","title":"Pagar Conta","summary":"Resumo financeiro","payload":{"title":"Nome da Conta","amount":120.0,"dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","isRecurring":true|false}}]

6. CASO SEJA LIVRO / LEITURA:
   [ACTION:{"type":"UPDATE_BOOK","title":"Atualizar Leitura","summary":"Avanço de leitura","payload":{"bookTitle":"Nome do Livro","currentPage":87}}]`;

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

        // Higienização estrita garantida no backend
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

          // Vincula a categoria correspondente do banco
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

          actionData.summary = `${sanitized.cleanTitle} (Data: ${actionData.payload.dueDate ? formatDate(actionData.payload.dueDate) : "Amanhã"}${actionData.payload.dueTime ? ` às ${actionData.payload.dueTime}` : ""} | Categoria: ${actionData.payload.categoryName || "Geral"})`;
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
