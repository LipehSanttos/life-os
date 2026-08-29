/**
 * @file route.ts (API /api/chat/confirm)
 * @description Endpoint de confirmação ou cancelamento de ações propostas pela IA no chat.
 * Executa as ferramentas correspondentes no banco de dados SQLite somente após a aprovação explícita do usuário.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { executeTool } from "@/lib/ai/tools";

/**
 * POST /api/chat/confirm
 * Executa ou descarta uma ação pendente emitida no chat (criação de tarefa, conta ou progresso).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, action, confirmed } = body;

    if (!messageId) {
      return NextResponse.json({ error: "O ID da mensagem é obrigatório." }, { status: 400 });
    }

    // Se o usuário cancelou a ação no cartão
    if (!confirmed) {
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          pendingAction: null,
          content: "*(Ação cancelada pelo usuário)*",
        },
      });
      return NextResponse.json({ success: true, message: "Ação cancelada." });
    }

    // Se confirmada, despacha para o motor de ferramentas
    let resultMessage = "Ação executada com sucesso!";
    if (action.type === "CREATE_TASK") {
      const res = await executeTool("create_task", action.payload, user.id);
      resultMessage = res.message || resultMessage;
    } else if (action.type === "REGISTER_FINANCE") {
      const res = await executeTool("register_financial_bill", action.payload, user.id);
      resultMessage = res.message || resultMessage;
    } else if (action.type === "UPDATE_BOOK") {
      const res = await executeTool("update_reading_progress", action.payload, user.id);
      resultMessage = res.message || resultMessage;
    } else if (action.type === "CREATE_PROJECT") {
      const res = await executeTool("create_project", action.payload, user.id);
      resultMessage = res.message || resultMessage;
    } else if (action.type === "UPDATE_TASK") {
      const res = await executeTool("update_task_status", action.payload, user.id);
      resultMessage = res.message || resultMessage;
    }

    // Atualiza a mensagem no chat com o indicador de sucesso
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        pendingAction: null,
        content: `✅ **${resultMessage}**`,
      },
    });

    return NextResponse.json({ success: true, message: resultMessage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao confirmar ação." }, { status: 500 });
  }
}
