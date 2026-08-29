/**
 * Smart Sanitizer for Task Titles and Descriptions
 * Extracts only the clean core action for the title (max 5-7 words)
 * and moves secondary explanations, dates, and preambles to description.
 */
export function extractCleanTaskTitleAndDescription(rawText: string): {
  cleanTitle: string;
  description: string;
  extractedTime?: string;
  extractedDayOfWeek?: string;
} {
  if (!rawText || !rawText.trim()) {
    return { cleanTitle: "Nova Atividade", description: "" };
  }

  let text = rawText.trim();
  let description = "";
  let extractedTime: string | undefined;
  let extractedDayOfWeek: string | undefined;

  // 1. Extract and normalize time mentions (e.g. 14h30, 14:30, 9h, 23:59)
  const timeRegex = /(?:às|as|para\s+as|para\s+às|até\s+as|até\s+às)\s*(\d{1,2})(?:[h:](\d{2})|h|\s*horas)?|\b(\d{1,2})[h:](\d{2})\b/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    const hours = timeMatch[1] || timeMatch[3];
    const minutes = timeMatch[2] || timeMatch[4] || "00";
    if (hours) {
      extractedTime = `${String(parseInt(hours, 10)).padStart(2, "0")}:${String(parseInt(minutes, 10)).padStart(2, "0")}`;
    }
  }

  // 2. Extract day of week / relative date
  const dateKeywordsRegex = /\b(na próxima|no próximo|na proxima|no proximo|nesta|neste)?\s*(segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo|semana que vem|próxima semana|proxima semana|amanhã|amanha|hoje|depois de amanhã|depois de amanha)\b/i;
  const dateMatch = text.match(dateKeywordsRegex);
  if (dateMatch) {
    extractedDayOfWeek = dateMatch[0].trim();
  }

  // 3. Remove conversational preambles
  const preambleRegex = /^(?:preciso|tenho que|tenho de|me lembra de|me lembre de|lembrar de|lembrete de|agendar para mim|agendar|agende|marca aí|marca|marcar|quero que você agende|quero agendar|adiciona uma tarefa para|adicionar uma tarefa para|cria uma tarefa para|criar uma tarefa para|adicionar|adiciona|cria|criar|anota aí|anotar|não posso esquecer de|favor agendar|coloque na agenda|definir|colocar)\s+/i;
  text = text.replace(preambleRegex, "");

  // 4. Remove relative date and time clauses from text
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

  // 5. Separate primary action from purpose/notes (e.g. "levar o Rex ao veterinário para tomar vacina" -> Title: "Levar o Rex ao veterinário", Description: "Para tomar vacina")
  const purposeSplitRegex = /\b(?:para|pra|afim de|com o objetivo de|com o intuito de)\s+(.*)$/i;
  const purposeMatch = text.match(purposeSplitRegex);

  let primaryAction = text;
  if (purposeMatch && purposeMatch[1] && purposeMatch[1].trim().length > 3) {
    const purposeText = purposeMatch[1].trim();
    // Only split if the primary action before 'para' is substantial (at least 2 words)
    const beforePurpose = text.substring(0, text.indexOf(purposeMatch[0])).trim();
    if (beforePurpose.split(" ").length >= 2) {
      primaryAction = beforePurpose;
      description = purposeText.charAt(0).toUpperCase() + purposeText.slice(1);
    }
  }

  // Clean leading "uma / um" (e.g. "uma reunião com João" -> "Reunião com João")
  primaryAction = primaryAction.replace(/^(?:uma|um)\s+/i, "").trim();

  // Capitalize first letter of each major word or clean sentence
  if (primaryAction.length > 0) {
    primaryAction = primaryAction.charAt(0).toUpperCase() + primaryAction.slice(1);
  } else {
    primaryAction = "Nova Tarefa";
  }

  // Remove trailing punctuation or prepositions
  primaryAction = primaryAction.replace(/[,\-–—:\.\s]+$/, "").trim();

  return {
    cleanTitle: primaryAction,
    description: description,
    extractedTime,
    extractedDayOfWeek,
  };
}

