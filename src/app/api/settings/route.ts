import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { id: "user_default" },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { id: "user_default", name: "Eduardo Felipe", email: "eduardo.felipe@lifeos.com" },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao obter configurações." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, theme, autoConfirmAiActions, notificationsEnabled, geminiApiKey } = body;

    const updated = await prisma.userSettings.upsert({
      where: { id: "user_default" },
      update: {
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
        theme: theme !== undefined ? theme : undefined,
        autoConfirmAiActions: autoConfirmAiActions !== undefined ? Boolean(autoConfirmAiActions) : undefined,
        notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : undefined,
        geminiApiKey: geminiApiKey !== undefined ? geminiApiKey : undefined,
      },
      create: {
        id: "user_default",
        name: name || "Eduardo Felipe",
        email: email || "eduardo.felipe@lifeos.com",
        theme: theme || "dark",
        autoConfirmAiActions: Boolean(autoConfirmAiActions),
        notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : true,
        geminiApiKey: geminiApiKey || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar configurações." }, { status: 500 });
  }
}
