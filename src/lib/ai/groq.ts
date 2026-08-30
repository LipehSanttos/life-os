/**
 * @file groq.ts
 * @description Módulo de integração com a API da Groq (LPUs ultra-rápidas)
 * utilizando modelos LLaMA 3.3 70B Versatile, LLaMA 3.1 8B Instant e Mixtral 8x7B.
 * Realiza interpretação semântica profunda e extração estrita de ações e títulos curtos.
 */

import { Groq } from "groq-sdk";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDate, formatCurrency } from "@/lib/utils";
import { extractCleanTaskTitleAndDescription } from "./sanitizer";
import { NLPResult } from "./fallback-nlp";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Processa a mensagem do chat utilizando o motor de inferência da Groq.
 *
 * @param prompt Mensagem enviada pelo usuário
 * @param history Histórico recente da conversa
 * @param userId ID do usuário autenticado no Life OS
 * @returns Resposta textual e ação estruturada para confirmação
 */
export async function processGroqChat(
  prompt: string,
  history: Message[] = [],
  userId?: string
): Promise<NLPResult> {
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const userSettings = await prisma.userSettings.findUnique({
    where: { id: "user_default" },
  });

  const apiKey = process.env.GROQ_API_KEY || userSettings?.groqApiKey;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GROQ_API_KEY não configurada.");
  }

  const groq = new Groq({ apiKey });

  const now = new Date();
  const todayStr = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const timeStr = format(now, "HH:mm");

  const userFilter = userId ? { userId } : {};

  // Busca o contexto completo e isolado do usuário no banco de dados
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

  const systemPrompt = `Você é o Assistente Pessoal de Inteligência Artificial do Life OS de ${userName}, potencializado pelos modelos da Groq (LLaMA 3.3).
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

REGRAS CRÍTICAS E OBRIGATÓRIAS DE EXTRAÇÃO DE TÍTULO:

1. O TÍTULO DA TAREFA DEVE CONTER EXCLUSIVAMENTE O NOME DA AÇÃO (MÁXIMO 2 A 5 PALAVRAS):
   - NUNCA use a frase inteira do usuário nem preâmbulos de conversação!
   - NUNCA coloque no título termos como "Gostaria que agendasse", "Me lembre de", "Por favor", "Preciso", datas ("amanhã", "terça") ou horários ("às 8h", "às 14h30").
   - Exemplos obrigatórios de títulos corretos:
     * Comando: "Me lembre de comprar pão amanhã, as 8h."
       -> Título: "Comprar pão"
       -> Horário: "08:00"
     * Comando: "Gostaria que agendasse uma reunião com o time amanhã às 10h"
       -> Título: "Reunião com o Time"
       -> Horário: "10:00"
     * Comando: "Preciso levar o Rex ao veterinário na próxima terça-feira às 14h30 para tomar a vacina de raiva"
       -> Título: "Levar o Rex ao Veterinário"
       -> Descrição: "Vacina de raiva para o Rex"
       -> Horário: "14:30"
     * Comando: "Gostaria que você marcasse entrega do trabalho de Banco de Dados na sexta às 23:59"
       -> Título: "Entregar Trabalho de Banco de Dados"
       -> Horário: "23:59"

2. CÁLCULO PRECISO DE DATA E HORÁRIO (A PARTIR DE HOJE: ${todayStr}):
   - Calcule a data ISO exata no formato ISO 8601 ("YYYY-MM-DDTHH:mm:ss.000Z").
   - Extraia o horário específico no formato "HH:mm" (ex: "08:00", "14:30", "09:00", "23:59").

3. CLASSIFICAÇÃO AUTOMÁTICA DE CATEGORIA E PRIORIDADE:
   - Veterinário / Médico / Dentista / Saúde / Remédio -> Categoria: "Saúde", Prioridade: "HIGH"
   - Faculdade / Prova / TCC / Trabalho Acadêmico -> Categoria: "Faculdade", Prioridade: "HIGH"
   - Reunião / Cliente / Freelancer -> Categoria: "Freelance", Prioridade: "HIGH"
   - Mercado / Compras -> Categoria: "Compras"
   - Casa / Faxina -> Categoria: "Casa"
   - Contas / Boletos -> Categoria: "Finanças"

4. FORMATO DE EMISSÃO DA AÇÃO NO FINAL DA MENSAGEM:
   - No texto da resposta, confirme com gentileza a atividade, o título limpo e o horário.
   - Emita no final da mensagem o bloco no formato exato:
   [ACTION:{"type":"CREATE_TASK","title":"Título Curto e Limpo","summary":"Título Curto e Limpo (Data: DD/MM/AAAA às HH:mm)","payload":{"title":"Título Curto e Limpo","description":"Notas e detalhes","categoryName":"Saúde|Faculdade|Trabalho|Freelance|Estudos|Compras|Casa|Finanças","priority":"HIGH|MEDIUM|LOW|URGENT","dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","dueTime":"HH:mm"}}]

5. CASO SEJA CONTA / FINANÇAS:
   [ACTION:{"type":"REGISTER_FINANCE","title":"Pagar Conta","summary":"Resumo financeiro","payload":{"title":"Nome da Conta","amount":120.0,"dueDate":"YYYY-MM-DDTHH:mm:ss.000Z","isRecurring":true|false}}]

6. CASO SEJA LIVRO:
   [ACTION:{"type":"UPDATE_BOOK","title":"Atualizar Leitura","summary":"Avanço de leitura","payload":{"bookTitle":"Nome do Livro","currentPage":87}}]`;

  const candidateModels = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
  ];

  let rawText = "";

  for (const modelName of candidateModels) {
    try {
      const messagesPayload: any[] = [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map((h) => ({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.content,
        })),
        { role: "user", content: prompt },
      ];

      const completion = await groq.chat.completions.create({
        model: modelName,
        messages: messagesPayload,
        temperature: 0.1,
        max_tokens: 1024,
      });

      rawText = completion.choices[0]?.message?.content || "";
      if (rawText && rawText.trim() !== "") {
        break;
      }
    } catch (err: any) {
      console.warn(`Groq model ${modelName} call failed:`, err.message || err);
    }
  }

  if (!rawText) {
    throw new Error("Todos os modelos Groq falharam em responder.");
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
        actionData.summary = `${sanitized.cleanTitle} (Data: ${actionData.payload.dueDate ? formatDate(actionData.payload.dueDate) : "Amanhã"}${actionData.payload.dueTime ? ` às ${actionData.payload.dueTime}` : ""})`;
      }
    } catch (err) {
      console.error("Falha ao analisar JSON de ação da Groq:", err);
    }
  }

  return {
    reply: cleanReply,
    action: actionData,
  };
}
