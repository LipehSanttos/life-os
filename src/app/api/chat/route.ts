/**
 * @file route.ts (API /api/chat)
 * @description Endpoint central para envio de mensagens e histórico de conversas do Chat com IA.
 * Suporta múltiplos provedores (Google Gemini 3.6 Flash & Groq LLaMA 3.3 70B) com isolamento por `userId`.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { processUnifiedAIChat } from "@/lib/ai";

/**
 * GET /api/chat
 * Recupera as sessões de chat ou as mensagens de uma sessão específica.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    // Retorna as mensagens da sessão solicitada
    if (sessionId) {
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId, session: { userId: user.id } },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(
        messages.map((m) => ({
          ...m,
          pendingAction: m.pendingAction ? JSON.parse(m.pendingAction) : null,
        }))
      );
    }

    // Lista todas as sessões de conversa do usuário
    let sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    // Se o usuário ainda não tiver nenhuma sessão, cria a conversa padrão de boas-vindas
    if (sessions.length === 0) {
      const newSession = await prisma.chatSession.create({
        data: { title: "Conversa Principal", userId: user.id },
      });
      await prisma.chatMessage.create({
        data: {
          sessionId: newSession.id,
          role: "assistant",
          content: `Olá, **${user.name}**! 👋 Sou seu assistente de organização do Life OS. Como posso te ajudar hoje?`,
        },
      });
      sessions = [newSession];
    }

    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao carregar chat." }, { status: 500 });
  }
}

/**
 * POST /api/chat
 * Envia uma mensagem para a IA unificada (Gemini / Groq / Fallback NLP) e persiste a resposta.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { message, sessionId: incomingSessionId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    let sessionId = incomingSessionId;
    if (!sessionId) {
      const newSession = await prisma.chatSession.create({
        data: { title: message.slice(0, 30), userId: user.id },
      });
      sessionId = newSession.id;
    } else {
      // SEGURANÇA: verifica se a sessão pertence ao usuário autenticado
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: user.id },
      });
      if (!session) {
        return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
      }
    }

    // Salva a mensagem do usuário
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: message.trim(),
      },
    });

    // Carrega o histórico recente (filtrado pela sessão verificada)
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // Processa a mensagem com a IA Unificada (Gemini + Groq + NLP) isolada para o usuário atual
    const aiResult = await processUnifiedAIChat(
      message.trim(),
      history.map((h) => ({ role: h.role as any, content: h.content })),
      user.id
    );

    // Salva a resposta do assistente e a ação pendente de confirmação (se houver)
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: "assistant",
        content: aiResult.reply,
        pendingAction: aiResult.action ? JSON.stringify(aiResult.action) : null,
      },
    });

    return NextResponse.json({
      sessionId,
      message: {
        ...assistantMsg,
        pendingAction: aiResult.action || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao processar chat com a IA." }, { status: 500 });
  }
}
