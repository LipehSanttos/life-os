/**
 * @file route.ts (API /api/settings)
 * @description Endpoint de gerenciamento das configurações do Life OS.
 * Suporta configuração das chaves de API (Google Gemini e Groq), tema e seleção do provedor de IA.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/settings
 * Retorna as configurações gerais do sistema.
 */
export async function GET(req: NextRequest) {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { id: "user_default" },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          id: "user_default",
          name: "Eduardo Felipe",
          email: "eduardo.felipe@lifeos.com",
          aiProvider: "HYBRID",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao obter configurações." }, { status: 500 });
  }
}

/**
 * PATCH /api/settings
 * Atualiza configurações de usuário, chaves de API do Gemini/Groq e motor preferencial de IA.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      theme,
      autoConfirmAiActions,
      notificationsEnabled,
      geminiApiKey,
      groqApiKey,
      aiProvider,
    } = body;

    const updated = await prisma.userSettings.upsert({
      where: { id: "user_default" },
      update: {
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
        theme: theme !== undefined ? theme : undefined,
        autoConfirmAiActions: autoConfirmAiActions !== undefined ? Boolean(autoConfirmAiActions) : undefined,
        notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : undefined,
        geminiApiKey: geminiApiKey !== undefined ? geminiApiKey : undefined,
        groqApiKey: groqApiKey !== undefined ? groqApiKey : undefined,
        aiProvider: aiProvider !== undefined ? aiProvider : undefined,
      },
      create: {
        id: "user_default",
        name: name || "Eduardo Felipe",
        email: email || "eduardo.felipe@lifeos.com",
        theme: theme || "dark",
        autoConfirmAiActions: Boolean(autoConfirmAiActions),
        notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : true,
        geminiApiKey: geminiApiKey || null,
        groqApiKey: groqApiKey || null,
        aiProvider: aiProvider || "HYBRID",
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar configurações." }, { status: 500 });
  }
}
