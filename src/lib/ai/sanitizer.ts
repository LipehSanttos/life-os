/**
 * @file sanitizer.ts
 * @description Módulo de higienização semântica de linguagem natural.
 * Responsável por extrair o núcleo da ação solicitada pelo usuário, gerando títulos curtos,
 * profissionais e limpos (4 a 6 palavras), separando cláusulas temporais e notas explicativas.
 */

/**
 * Interface com os dados extraídos da mensagem do usuário
 */
export interface CleanTaskExtraction {
  /** Título conciso da tarefa (ex: "Levar o Rex ao Veterinário") */
  cleanTitle: string;
  /** Detalhes explicativos ou notas (ex: "Vacina de raiva para o Rex") */
  description: string;
  /** Horário extraído no formato "HH:mm" (ex: "14:30") */
  extractedTime?: string;
  /** Dia da semana ou referência temporal identificada (ex: "terça-feira") */
  extractedDayOfWeek?: string;
}

/**
 * Analisa a frase enviada pelo usuário, remove preâmbulos de conversação,
 * cláusulas de tempo/datas e separa o objetivo principal de explicações secundárias.
 *
 * @param rawText Texto cru digitado pelo usuário no chat
 * @returns Objeto com título limpo, descrição e horários identificados
 */
export function extractCleanTaskTitleAndDescription(rawText: string): CleanTaskExtraction {
  if (!rawText || !rawText.trim()) {
    return { cleanTitle: "Nova Atividade", description: "" };
  }

  let text = rawText.trim();
  let description = "";
  let extractedTime: string | undefined;
  let extractedDayOfWeek: string | undefined;

  // 1. Extração e normalização de horários (ex: 14h30, 14:30, às 9h, até as 23:59)
  const timeRegex = /(?:às|as|para\s+as|para\s+às|até\s+as|até\s+às)\s*(\d{1,2})(?:[h:](\d{2})|h|\s*horas)?|\b(\d{1,2})[h:](\d{2})\b/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    const hours = timeMatch[1] || timeMatch[3];
    const minutes = timeMatch[2] || timeMatch[4] || "00";
    if (hours) {
      extractedTime = `${String(parseInt(hours, 10)).padStart(2, "0")}:${String(parseInt(minutes, 10)).padStart(2, "0")}`;
    }
  }

  // 2. Extração de dias da semana e referências temporais relativas
  const dateKeywordsRegex = /\b(na próxima|no próximo|na proxima|no proximo|nesta|neste)?\s*(segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo|semana que vem|próxima semana|proxima semana|amanhã|amanha|hoje|depois de amanhã|depois de amanha)\b/i;
  const dateMatch = text.match(dateKeywordsRegex);
  if (dateMatch) {
    extractedDayOfWeek = dateMatch[0].trim();
  }

  // 3. Remoção de preâmbulos coloquiais de conversa
  const preambleRegex = /^(?:preciso|tenho que|tenho de|me lembra de|me lembre de|lembrar de|lembrete de|agendar para mim|agendar|agende|marca aí|marca|marcar|quero que você agende|quero agendar|adiciona uma tarefa para|adicionar uma tarefa para|cria uma tarefa para|criar uma tarefa para|adicionar|adiciona|cria|criar|anota aí|anotar|não posso esquecer de|favor agendar|coloque na agenda|definir|colocar)\s+/i;
  text = text.replace(preambleRegex, "");

  // 4. Remoção de termos temporais do corpo do texto
  text = text
    .replace(/\b(?:na próxima|no próximo|na proxima|no proximo|nesta|neste)\s+(?:segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo|semana)\b/gi, "")
    .replace(/\b(?:segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo)\b/gi, "")
    .replace(/\b(?:amanhã|amanha|hoje|depois de amanhã|depois de amanha|cedo|de manhã|à tarde|a tarde|à noite|a noite|no final da tarde)\b/gi, "")
    .replace(/(?:às|as|para\s+as|para\s+às|até\s+as|até\s+às)\s*\d{1,2}(?:[h:]\d{2}|h|\s*horas)?/gi, "")
    .replace(/\b\d{1,2}[h:]\d{2}\b/gi, "")
    .replace(/\b\d{1,2}\s*horas\b/gi, "")
    .replace(/\bdia\s*\d{1,2}(?:\s*de\s*[a-zç]+)?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // 5. Separação de objetivo/propósito secundário (ex: "para tomar a vacina de raiva")
  const purposeSplitRegex = /\b(?:para|pra|afim de|com o objetivo de|com o intuito de)\s+(.*)$/i;
  const purposeMatch = text.match(purposeSplitRegex);

  let primaryAction = text;
  if (purposeMatch && purposeMatch[1] && purposeMatch[1].trim().length > 3) {
    const purposeText = purposeMatch[1].trim();
    const beforePurpose = text.substring(0, text.indexOf(purposeMatch[0])).trim();
    if (beforePurpose.split(" ").length >= 2) {
      primaryAction = beforePurpose;
      description = purposeText.charAt(0).toUpperCase() + purposeText.slice(1);
    }
  }

  // Limpeza de artigos indefinidos iniciais (ex: "uma reunião com João" -> "Reunião com João")
  primaryAction = primaryAction.replace(/^(?:uma|um)\s+/i, "").trim();

  // Capitalização da primeira letra
  if (primaryAction.length > 0) {
    primaryAction = primaryAction.charAt(0).toUpperCase() + primaryAction.slice(1);
  } else {
    primaryAction = "Nova Tarefa";
  }

  // Remoção de pontuação residual no final
  primaryAction = primaryAction.replace(/[,\-–—:\.\s]+$/, "").trim();

  return {
    cleanTitle: primaryAction,
    description: description,
    extractedTime,
    extractedDayOfWeek,
  };
}
