/**
 * @file index.ts (src/lib/ai)
 * @description Orquestrador unificado de Inteligência Artificial para o Life OS.
 * Gerencia o roteamento entre Google Gemini (3.6 Flash) e Groq (LLaMA 3.3 70B),
 * aplicando chaveamento inteligente, tolerância a falhas e fallback determinístico local.
 */

import { prisma } from "@/lib/db";
import { processAIChat as processGeminiChat } from "./gemini";
import { processGroqChat } from "./groq";
import { processFallbackNLP, NLPResult } from "./fallback-nlp";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Ponto de entrada universal para o Chat com IA no Life OS.
 * Seleciona o provedor configurado (Gemini ou Groq) com suporte a failover automático.
 *
 * @param prompt Mensagem enviada pelo usuário
 * @param history Histórico recente da conversa
 * @param userId ID do usuário autenticado
 * @returns Resposta formatada da IA e ação estruturada para confirmação
 */
export async function processUnifiedAIChat(
  prompt: string,
  history: Message[] = [],
  userId?: string
): Promise<NLPResult> {
  const userSettings = await prisma.userSettings.findUnique({
    where: { id: "user_default" },
  });

  const preferredProvider = userSettings?.aiProvider || "HYBRID";
  const geminiKey = process.env.GEMINI_API_KEY || userSettings?.geminiApiKey;
  const groqKey = process.env.GROQ_API_KEY || userSettings?.groqApiKey;

  // 1. Caso o provedor preferencial seja GROQ
  if (preferredProvider === "GROQ" && groqKey) {
    try {
      return await processGroqChat(prompt, history, userId);
    } catch (groqErr) {
      console.warn("Groq falhou, tentando fallback para Gemini:", groqErr);
      if (geminiKey) {
        try {
          return await processGeminiChat(prompt, history, userId);
        } catch (geminiErr) {
          console.warn("Gemini também falhou:", geminiErr);
        }
      }
    }
  }

  // 2. Caso o provedor preferencial seja GEMINI ou HYBRID
  if (geminiKey) {
    try {
      return await processGeminiChat(prompt, history, userId);
    } catch (geminiErr) {
      console.warn("Gemini falhou, tentando fallback para Groq:", geminiErr);
      if (groqKey) {
        try {
          return await processGroqChat(prompt, history, userId);
        } catch (groqErr) {
          console.warn("Groq também falhou:", groqErr);
        }
      }
    }
  } else if (groqKey) {
    // Se apenas Groq estiver configurado
    try {
      return await processGroqChat(prompt, history, userId);
    } catch (groqErr) {
      console.warn("Groq falhou:", groqErr);
    }
  }

  // 3. Fallback final: Motor local determinístico NLP
  return processFallbackNLP(prompt, userId);
}

