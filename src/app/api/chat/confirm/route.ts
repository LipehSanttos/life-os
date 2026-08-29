import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { executeTool } from "@/lib/ai/tools";

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
