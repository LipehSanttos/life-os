/**
 * @file sanitizer.ts
 * @description Módulo de higienização semântica e extração de ações para o Chat do Life OS.
 * Extrai estritamente o núcleo da tarefa solicitada pelo usuário (ex: "Comprar pão"),
 * removendo preâmbulos como "gostaria que agendasse", "me lembre de", "por favor",
 * além de todas as referências temporais (datas, dias da semana, horários) e pontuações residuais.
 */

export interface CleanTaskExtraction {
  /** Título limpo e conciso da tarefa (ex: "Comprar pão", "Levar o Rex ao Veterinário") */
  cleanTitle: string;
  /** Descrição explicativa ou objetivo secundário (ex: "Vacina de raiva para o Rex") */
  description: string;
  /** Horário extraído no formato "HH:mm" (ex: "08:00", "14:30") */
  extractedTime?: string;
  /** Dia da semana ou referência temporal identificada (ex: "amanhã", "terça-feira") */
  extractedDayOfWeek?: string;
}

/**
 * Higieniza qualquer texto enviado pelo usuário ou retornado pela IA,
 * garantindo que o título contenha exclusivamente a ação essencial.
 *
 * @param rawText Texto da solicitação do usuário
 * @returns Objeto com título curto, descrição limpa e horários
 */
export function extractCleanTaskTitleAndDescription(rawText: string): CleanTaskExtraction {
  if (!rawText || !rawText.trim()) {
    return { cleanTitle: "Nova Atividade", description: "" };
  }

  let text = rawText.trim();
  let description = "";
  let extractedTime: string | undefined;
  let extractedDayOfWeek: string | undefined;

  // 1. Extração de Horários (ex: "às 8h", "as 8h", "14h30", "14:30", "às 08:00", "às 9 horas")
  const timeMatch = text.match(/(?:às|as|para\s+as|para\s+às|até\s+as|até\s+às|pras|pra\s+as)\s*(\d{1,2})(?:[h:](\d{2})|h|\s*horas)?/i) || text.match(/\b(\d{1,2})[h:](\d{2})\b|\b(\d{1,2})h\b/i);
  if (timeMatch) {
    const hours = timeMatch[1] || timeMatch[3];
    const minutes = timeMatch[2] || timeMatch[4] || "00";
    if (hours && parseInt(hours, 10) <= 23) {
      extractedTime = `${String(parseInt(hours, 10)).padStart(2, "0")}:${String(parseInt(minutes, 10)).padStart(2, "0")}`;
    }
  }

  // 2. Extração de Dia / Referência temporal
  const dateKeywordsRegex = /(?:na\s+próxima|no\s+próximo|na\s+proxima|no\s+proximo|nesta|neste|nessa|nesse|da\s+próxima|do\s+próximo)?\s*(?:segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo|semana\s+que\s+vem|próxima\s+semana|proxima\s+semana|depois\s+de\s+amanhã|depois\s+de\s+amanha|amanhã|amanha|hoje)/i;
  const dateMatch = text.match(dateKeywordsRegex);
  if (dateMatch) {
    extractedDayOfWeek = dateMatch[0].trim();
  }

  // 3. Remoção de saudações iniciais ("olá", "bom dia", "por favor", etc.)
  text = text.replace(/^(?:olá|ola|oi|bom dia|boa tarde|boa noite|por favor|por gentileza|pfv|ei|opa)[,\s]+/i, "");

  // 4. Remoção exaustiva de preâmbulos coloquiais e solicitações
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

  // 5. Separação de objetivo/propósito secundário (ex: "para tomar a vacina de raiva")
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

  // 6. Remoção de datas, dias e horários
  primaryAction = primaryAction
    // Referências relativas com prefixo e dias da semana
    .replace(/(?:na\s+próxima|no\s+próximo|na\s+proxima|no\s+proximo|nesta|neste|nessa|nesse|da\s+próxima|do\s+próximo)?\s*(?:segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo|semana\s+que\s+vem|próxima\s+semana|proxima\s+semana|depois\s+de\s+amanhã|depois\s+de\s+amanha|amanhã|amanha|hoje)/gi, "")
    // Períodos do dia
    .replace(/(?:cedo|de\s+manhã|de\s+manha|à\s+tarde|a\s+tarde|de\s+tarde|à\s+noite|a\s+noite|de\s+noite|no\s+final\s+da\s+tarde)/gi, "")
    // Expressões de horário com preposição ("às 8h", "as 8h", "para as 8h", "às 14:30", "pras 8h")
    .replace(/(?:às|as|para\s+as|para\s+às|até\s+as|até\s+às|pras|pra\s+as)\s*\d{1,2}(?:[h:]\d{2}|h|\s*horas|\s*hrs|\s*hr)?/gi, "")
    // Horários isolados
    .replace(/\b\d{1,2}[h:]\d{2}\b/gi, "")
    .replace(/\b\d{1,2}h\b/gi, "")
    .replace(/\b\d{1,2}\s*horas\b/gi, "")
    // Expressões de data de calendário ("no dia 15 de maio", "dia 10")
    .replace(/(?:no\s+dia|dia)\s*\d{1,2}(?:\s*de\s*[a-zç]+)?/gi, "");

  // 7. Limpeza de pontuação e espaços
  primaryAction = primaryAction
    .replace(/[,\-–—:\.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 8. Remoção de preposições ou artigos residuais soltos no início ou no fim
  primaryAction = primaryAction
    .replace(/^(?:uma|um|o|a|os|as|de|da|do|em|na|no|para|pra)\s+/i, "")
    .replace(/\s+(?:na|no|em|de|da|do|para|pra|às|as|a|o|com)$/i, "")
    .trim();

  // 9. Se sobrou preâmbulo residual no início, remove novamente
  for (const pattern of preamblePatterns) {
    primaryAction = primaryAction.replace(pattern, "").trim();
  }

  // 10. Capitalização da primeira letra
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
  };
}
