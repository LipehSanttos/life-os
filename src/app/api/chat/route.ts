import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { processAIChat } from "@/lib/ai/gemini";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

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

    let sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    if (sessions.length === 0) {
      const newSession = await prisma.chatSession.create({
        data: { title: "Conversa Principal", userId: user.id },
      });
      // Initial welcome message
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
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: message.trim(),
      },
    });

    // Load recent history
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // Process with Gemini AI strictly scoped to user.id
    const aiResult = await processAIChat(
      message.trim(),
      history.map((h) => ({ role: h.role as any, content: h.content })),
      user.id
    );

    // Save AI response
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
