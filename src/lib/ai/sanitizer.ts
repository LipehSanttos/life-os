/**
 * @file sanitizer.ts
 * @description Módulo de higienização semântica e extração inteligente de ações para o Chat do Life OS.
 * Extrai estritamente o núcleo da tarefa solicitada pelo usuário (ex: "Comprar pão na padaria"),
 * extraindo valores monetários reais, páginas de livros, nomes de clientes,
 * removendo preâmbulos como "gostaria que agendasse", saudações e referências temporais.
 */

export interface CleanTaskExtraction {
  /** Título limpo e conciso da tarefa (ex: "Comprar Pão na Padaria", "Levar o Rex ao Veterinário") */
  cleanTitle: string;
  /** Descrição explicativa ou objetivo secundário (ex: "Vacina de raiva para o Rex") */
  description: string;
  /** Horário extraído no formato "HH:mm" (ex: "08:00", "14:30") */
  extractedTime?: string;
  /** Referência temporal identificada (ex: "amanhã", "terça-feira") */
  extractedDayOfWeek?: string;
  /** Valor monetário explicitamente informado pelo usuário (ex: 150.0, 3500.0) ou undefined */
  extractedAmount?: number;
  /** Nome de cliente identificado para tarefas de trabalho/freelance */
  extractedClientName?: string;
  /** Número de páginas extraído para leituras */
  extractedPages?: number;
  /** Sugestão de categoria semântica */
  suggestedCategorySlug?: string;
  /** Sugestão de prioridade ("LOW" | "MEDIUM" | "HIGH" | "URGENT") */
  suggestedPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

/**
 * Extrai valor monetário explicitamente informado pelo usuário.
 * NUNCA retorna valores aleatórios ou defaults.
 */
export function extractMonetaryValue(text: string): number | undefined {
  if (!text) return undefined;

  // Casos: "R$ 1.500,50", "R$ 150", "150,00 reais", "2500 reais", "valor de R$ 300", "de 120 reais"
  const regex =
    /(?:R\$\s*|valor\s+de\s+R?\$?\s*|no\s+valor\s+de\s+R?\$?\s*)(\d{1,3}(?:\.\d{3})*|\d+)(?:,\s*(\d{2})|\.\s*(\d{2}))?|\b(\d{1,3}(?:\.\d{3})*|\d+)(?:,\s*(\d{2})|\.\s*(\d{2}))?\s*(?:reais|real)\b/i;

  const match = text.match(regex);
  if (match) {
    let intPart = match[1] || match[4] || "";
    let centPart = match[2] || match[3] || match[5] || match[6] || "";

    intPart = intPart.replace(/\./g, "").replace(/,/g, ".");
    let parsed = parseFloat(intPart);
    if (centPart && !intPart.includes(".")) {
      parsed += parseFloat(centPart) / 100;
    }

    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

/**
 * Extrai número de páginas explicitamente informado pelo usuário.
 */
export function extractPageNumber(text: string): number | undefined {
  if (!text) return undefined;
  const match =
    text.match(/\bp[áa]gina\s*(\d+)\b/i) ||
    text.match(/\b(\d+)\s*p[áa]g(?:inas?)?\b/i) ||
    text.match(/\bli\s*(\d+)\s*p[áa]g/i);

  if (match) {
    const p = parseInt(match[1], 10);
    if (!isNaN(p) && p > 0) return p;
  }
  return undefined;
}

/**
 * Extrai nome do cliente em tarefas de trabalho ou freelance.
 */
export function extractClientName(text: string): string | undefined {
  if (!text) return undefined;
  const match =
    text.match(/(?:cliente|com\s+o\s+cliente|para\s+o\s+cliente)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i) ||
    text.match(/(?:reunião\s+com|projeto\s+do|projeto\s+da)\s+([A-ZÀ-Ú][a-zà-ú]+)/i);

  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Higieniza qualquer texto enviado pelo usuário ou retornado pela IA,
 * garantindo que o título contenha exclusivamente a ação essencial
 * e extraindo fielmente os valores informados na entrada.
 */
export function extractCleanTaskTitleAndDescription(rawText: string): CleanTaskExtraction {
  if (!rawText || !rawText.trim()) {
    return { cleanTitle: "Nova Atividade", description: "" };
  }

  let text = rawText.trim();
  let description = "";
  let extractedTime: string | undefined;
  let extractedDayOfWeek: string | undefined;
  let suggestedCategorySlug = "outros";
  let suggestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM";

  const extractedAmount = extractMonetaryValue(text);
  const extractedPages = extractPageNumber(text);
  const extractedClientName = extractClientName(text);

  const lower = text.toLowerCase();

  // 1. Detecção semântica de categoria e prioridade
  if (
    lower.includes("aniversár") ||
    lower.includes("aniversar") ||
    lower.includes("niver") ||
    lower.includes("parabéns") ||
    lower.includes("parabens")
  ) {
    suggestedCategorySlug = "aniversarios";
    suggestedPriority = "HIGH";
  } else if (
    lower.includes("veterinár") ||
    lower.includes("veterinar") ||
    lower.includes("médic") ||
    lower.includes("medic") ||
    lower.includes("dentista") ||
    lower.includes("vacina") ||
    lower.includes("remédio") ||
    lower.includes("remedio") ||
    lower.includes("exame") ||
    lower.includes("consulta") ||
    lower.includes("terapia") ||
    lower.includes("psicólog") ||
    lower.includes("cardiolog") ||
    lower.includes("oftalmo")
  ) {
    suggestedCategorySlug = "saude";
    suggestedPriority = "HIGH";
  } else if (
    lower.includes("faculdade") ||
    lower.includes("prova") ||
    lower.includes("tcc") ||
    lower.includes("seminário") ||
    lower.includes("seminario") ||
    lower.includes("trabalho acadêmico") ||
    lower.includes("trabalho academico") ||
    lower.includes("banco de dados") ||
    lower.includes("matéria") ||
    lower.includes("materia") ||
    lower.includes("disciplina")
  ) {
    suggestedCategorySlug = "faculdade";
    suggestedPriority = "HIGH";
  } else if (
    lower.includes("cliente") ||
    lower.includes("reunião") ||
    lower.includes("reuniao") ||
    lower.includes("orçamento") ||
    lower.includes("orcamento") ||
    lower.includes("proposta") ||
    lower.includes("contrato") ||
    lower.includes("projeto") ||
    lower.includes("freela") ||
    lower.includes("freelance") ||
    lower.includes("entrega") ||
    lower.includes("relatório") ||
    lower.includes("relatorio")
  ) {
    suggestedCategorySlug = "freelance";
    suggestedPriority = "HIGH";
  } else if (
    lower.includes("curso") ||
    lower.includes("módulo") ||
    lower.includes("modulo") ||
    lower.includes("aula") ||
    lower.includes("estudar") ||
    lower.includes("estudo") ||
    lower.includes("leitura")
  ) {
    suggestedCategorySlug = "estudos";
  } else if (
    lower.includes("comprar") ||
    lower.includes("compra") ||
    lower.includes("mercado") ||
    lower.includes("supermercado") ||
    lower.includes("padaria") ||
    lower.includes("farmácia") ||
    lower.includes("farmacia") ||
    lower.includes("shopping")
  ) {
    suggestedCategorySlug = "compras";
  } else if (
    lower.includes("casa") ||
    lower.includes("limpar") ||
    lower.includes("faxina") ||
    lower.includes("lavar") ||
    lower.includes("conserto") ||
    lower.includes("reforma") ||
    lower.includes("manutenção") ||
    lower.includes("manutencao")
  ) {
    suggestedCategorySlug = "casa";
  } else if (
    lower.includes("pagar") ||
    lower.includes("boleto") ||
    lower.includes("conta") ||
    lower.includes("fatura") ||
    lower.includes("transferência") ||
    lower.includes("pix")
  ) {
    suggestedCategorySlug = "financas";
  }

  // 2. Extração de Horários (ex: "às 8h", "as 8h", "14h30", "14:30", "às 08:00", "às 9 horas", "de manhã")
  const timeMatch =
    text.match(/(?:às|as|para\s+as|para\s+às|até\s+as|até\s+às|pras|pra\s+as)\s*(\d{1,2})(?:[h:](\d{2})|h|\s*horas)?/i) ||
    text.match(/\b(\d{1,2})[h:](\d{2})\b|\b(\d{1,2})h\b/i);

  if (timeMatch) {
    const hours = timeMatch[1] || timeMatch[3];
    const minutes = timeMatch[2] || timeMatch[4] || "00";
    if (hours && parseInt(hours, 10) <= 23) {
      extractedTime = `${String(parseInt(hours, 10)).padStart(2, "0")}:${String(parseInt(minutes, 10)).padStart(2, "0")}`;
    }
  } else if (lower.includes("de manhã") || lower.includes("de manha") || lower.includes("pela manhã")) {
    extractedTime = "09:00";
  } else if (lower.includes("à tarde") || lower.includes("a tarde") || lower.includes("pela tarde")) {
    extractedTime = "14:00";
  } else if (lower.includes("à noite") || lower.includes("a noite") || lower.includes("pela noite")) {
    extractedTime = "19:00";
  } else if (lower.includes("final da tarde") || lower.includes("fim de tarde")) {
    extractedTime = "17:30";
  }

  // 3. Extração de Dia / Referência temporal
  const dateKeywordsRegex =
    /(?:na\s+próxima|no\s+próximo|na\s+proxima|no\s+proximo|nesta|neste|nessa|nesse|da\s+próxima|do\s+próximo)?\s*(?:segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo|semana\s+que\s+vem|próxima\s+semana|proxima\s+semana|depois\s+de\s+amanhã|depois\s+de\s+amanha|amanhã|amanha|hoje)/i;
  const dateMatch = text.match(dateKeywordsRegex);
  if (dateMatch) {
    extractedDayOfWeek = dateMatch[0].trim();
  }

  // 4. Remoção de saudações e cortesias iniciais
  text = text.replace(
    /^(?:olá|ola|oi|bom dia|boa tarde|boa noite|e aí|e ai|fala aí|fala ai|opa|ei|por favor|por gentileza|pfv|se puder|quando puder)[,\s!.]+/i,
    ""
  );

  // 5. Remoção de preâmbulos coloquiais de solicitação
  const preamblePatterns = [
    /^(?:gostaria\s+que\s+você\s+agendasse\s+para\s+mim|gostaria\s+que\s+você\s+agendasse|gostaria\s+que\s+agendasse\s+para\s+mim|gostaria\s+que\s+agendasse|gostaria\s+de\s+agendar\s+para\s+mim|gostaria\s+de\s+agendar|gostaria\s+que\s+você\s+marcasse|gostaria\s+que\s+marcasse|gostaria\s+de\s+marcar|gostaria\s+que\s+você\s+criasse|gostaria\s+que\s+criasse|gostaria\s+de\s+criar|gostaria\s+que\s+você|gostaria\s+que|gostaria\s+de|gostaria)\s+/i,
    /^(?:quero\s+que\s+você\s+agende|quero\s+que\s+você\s+marque|quero\s+que\s+agende|quero\s+que\s+marque|quero\s+agendar|quero\s+marcar|quero\s+criar\s+uma\s+tarefa\s+para|quero\s+criar\s+uma\s+tarefa\s+de|quero\s+criar|quero\s+que|quero)\s+/i,
    /^(?:pode\s+agendar\s+para\s+mim|pode\s+agendar|poderia\s+agendar\s+para\s+mim|poderia\s+agendar|pode\s+me\s+lembrar\s+de|pode\s+me\s+lembrar|poderia\s+me\s+lembrar\s+de|poderia\s+me\s+lembrar|pode\s+marcar|poderia\s+marcar|pode\s+criar\s+uma\s+tarefa\s+para|pode\s+criar|poderia\s+criar|pode\s+colocar\s+na\s+agenda|pode\s+colocar|pode)\s+/i,
    /^(?:me\s+lembra\s+de\s+agendar|me\s+lembre\s+de\s+agendar|me\s+lembra\s+de|me\s+lembre\s+de|me\s+lembra|me\s+lembre|lembrar\s+de|lembrete\s+de|lembrete\s+para|lembrete)\s+/i,
    /^(?:não\s+posso\s+esquecer\s+de|não\s+esquecer\s+de|favor\s+agendar|favor\s+lembrar\s+de|favor\s+criar|favor\s+marcar|favor\s+colocar\s+na\s+agenda|favor|preciso\s+que\s+você\s+agende|preciso\s+que\s+você|preciso\s+agendar|preciso\s+marcar|preciso\s+criar|preciso\s+de|preciso|tenho\s+que|tenho\s+de|tenho)\s+/i,
    /^(?:cria\s+uma\s+tarefa\s+para|criar\s+uma\s+tarefa\s+para|cria\s+uma\s+tarefa\s+de|criar\s+uma\s+tarefa\s+de|cria\s+uma\s+tarefa|criar\s+uma\s+tarefa|crie\s+uma\s+tarefa\s+para|crie\s+uma\s+tarefa|adiciona\s+uma\s+tarefa\s+para|adicionar\s+uma\s+tarefa\s+para|adiciona\s+uma\s+tarefa|adicionar\s+uma\s+tarefa|adiciona|adicionar|cria|criar|crie|marca\s+aí|marcar|marca|agendar|agende|anota\s+aí|anotar|anota|coloque\s+na\s+agenda|colocar\s+na\s+agenda|definir|colocar)\s+/i,
  ];

  let previousText = "";
  while (text !== previousText) {
    previousText = text;
    for (const pattern of preamblePatterns) {
      text = text.replace(pattern, "").trim();
    }
  }

  // 6. Separação de objetivo/propósito secundário (ex: "para tomar a vacina de raiva")
  const purposeSplitRegex = /\b(?:para|pra|afim\s+de|a\s+fim\s+de|com\s+o\s+objetivo\s+de|com\s+o\s+intuito\s+de)\s+(.*)$/i;
  const purposeMatch = text.match(purposeSplitRegex);

  let primaryAction = text;
  if (purposeMatch && purposeMatch[1] && purposeMatch[1].trim().length > 2) {
    const purposeText = purposeMatch[1].trim();
    const beforePurpose = text.substring(0, text.indexOf(purposeMatch[0])).trim();
    if (beforePurpose.split(" ").length >= 2) {
      primaryAction = beforePurpose;
      description = purposeText.charAt(0).toUpperCase() + purposeText.slice(1);
    }
  }

  // 7. Remoção de menções explícitas de valores monetários do título da tarefa
  primaryAction = primaryAction
    .replace(/(?:R\$\s*|valor\s+de\s+R?\$?\s*|no\s+valor\s+de\s+R?\$?\s*)(\d{1,3}(?:\.\d{3})*|\d+)(?:,\s*(\d{2})|\.\s*(\d{2}))?/gi, "")
    .replace(/\b(\d{1,3}(?:\.\d{3})*|\d+)(?:,\s*(\d{2})|\.\s*(\d{2}))?\s*(?:reais|real)\b/gi, "")
    .replace(/(?:no\s+valor\s+de|valor\s+de|de\s+R\$|de\s+\d+)/gi, "");

  // 8. Remoção de datas, dias e horários do título
  primaryAction = primaryAction
    .replace(
      /(?:na\s+próxima|no\s+próximo|na\s+proxima|no\s+proximo|nesta|neste|nessa|nesse|da\s+próxima|do\s+próximo)?\s*(?:segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo|semana\s+que\s+vem|próxima\s+semana|proxima\s+semana|depois\s+de\s+amanhã|depois\s+de\s+amanha|amanhã|amanha|hoje)/gi,
      ""
    )
    .replace(
      /(?:cedo|de\s+manhã|de\s+manha|pela\s+manhã|pela\s+manha|à\s+tarde|a\s+tarde|de\s+tarde|pela\s+tarde|à\s+noite|a\s+noite|de\s+noite|pela\s+noite|no\s+final\s+da\s+tarde|no\s+fim\s+de\s+tarde)/gi,
      ""
    )
    .replace(/(?:às|as|para\s+as|para\s+às|até\s+as|até\s+às|pras|pra\s+as)\s*\d{1,2}(?:[h:]\d{2}|h|\s*horas|\s*hrs|\s*hr)?/gi, "")
    .replace(/\b\d{1,2}[h:]\d{2}\b/gi, "")
    .replace(/\b\d{1,2}h\b/gi, "")
    .replace(/\b\d{1,2}\s*horas\b/gi, "")
    .replace(/(?:no\s+dia|dia)\s*\d{1,2}(?:\s*de\s*[a-zç]+)?/gi, "");

  // 9. Limpeza de pontuação e espaços múltiplos
  primaryAction = primaryAction
    .replace(/[,\-–—:\.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 10. Remoção de preposições ou artigos residuais soltos no início ou no fim
  primaryAction = primaryAction
    .replace(/^(?:uma|um|o|a|os|as|de|da|do|em|na|no|para|pra)\s+/i, "")
    .replace(/\s+(?:na|no|em|de|da|do|para|pra|às|as|a|o|com|de\s+R\$)$/i, "")
    .trim();

  // 11. Se sobrou preâmbulo residual no início, remove novamente
  for (const pattern of preamblePatterns) {
    primaryAction = primaryAction.replace(pattern, "").trim();
  }

  // 12. Capitalização limpa da ação
  if (primaryAction.length > 0) {
    primaryAction = primaryAction.charAt(0).toUpperCase() + primaryAction.slice(1);
  } else {
    primaryAction = "Nova Tarefa";
  }

  // Remoção de qualquer pontuação final
  primaryAction = primaryAction.replace(/[,\-–—:\.\s]+$/, "").trim();

  return {
    cleanTitle: primaryAction,
    description,
    extractedTime,
    extractedDayOfWeek,
    extractedAmount,
    extractedClientName,
    extractedPages,
    suggestedCategorySlug,
    suggestedPriority,
  };
}
