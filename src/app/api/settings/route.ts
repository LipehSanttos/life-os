/**
 * @file route.ts (API /api/settings)
 * @description Endpoint de gerenciamento das configurações do Life OS.
 * Restringe estritamente o gerenciamento de chaves de API (Gemini e Groq) e do provedor de IA
 * para usuários com privilégios de Administrador (`ADMIN`).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/settings
 * Retorna as configurações do sistema, indicando se o usuário possui privilégios de Admin.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const isAdmin = user.role === "ADMIN";

    let settings = await prisma.userSettings.findUnique({
      where: { id: "user_default" },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          id: "user_default",
          name: user.name || "Eduardo Felipe",
          email: user.email || "eduardo.felipe@lifeos.com",
          aiProvider: "HYBRID",
        },
      });
    }

    // Se não for admin, omite as chaves de API por segurança
    const sanitizedSettings = {
      ...settings,
      name: user.name,
      email: user.email,
      isAdmin,
      geminiApiKey: isAdmin ? settings.geminiApiKey : (settings.geminiApiKey ? "••••••••••••••••" : ""),
      groqApiKey: isAdmin ? settings.groqApiKey : (settings.groqApiKey ? "••••••••••••••••" : ""),
      hasGeminiKey: Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY),
      hasGroqKey: Boolean(settings.groqApiKey || process.env.GROQ_API_KEY),
    };

    return NextResponse.json(sanitizedSettings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao obter configurações." }, { status: 500 });
  }
}

/**
 * PATCH /api/settings
 * Atualiza configurações de usuário.
 * REQUISITO DE SEGURANÇA: Alteração de chaves de API e provedor de IA é restrita a ADMIN.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const isAdmin = user.role === "ADMIN";
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

    // Se usuário não-admin tentar alterar chaves de IA ou provedor, bloqueia
    const isAttemptingAiChange =
      geminiApiKey !== undefined || groqApiKey !== undefined || aiProvider !== undefined;

    if (isAttemptingAiChange && !isAdmin) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas o usuário Administrador pode configurar as chaves de API e motores de IA do sistema." },
        { status: 403 }
      );
    }

    // Atualiza nome do usuário no modelo User caso alterado
    if (name && name.trim()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: name.trim() },
      });
    }

    const updateData: any = {
      name: name !== undefined ? name : undefined,
      email: email !== undefined ? email : undefined,
      theme: theme !== undefined ? theme : undefined,
      autoConfirmAiActions: autoConfirmAiActions !== undefined ? Boolean(autoConfirmAiActions) : undefined,
      notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : undefined,
    };

    // Apenas admins podem alterar chaves de API e provedores no banco
    if (isAdmin) {
      if (geminiApiKey !== undefined) updateData.geminiApiKey = geminiApiKey.trim() || null;
      if (groqApiKey !== undefined) updateData.groqApiKey = groqApiKey.trim() || null;
      if (aiProvider !== undefined) updateData.aiProvider = aiProvider;
    }

    const updated = await prisma.userSettings.upsert({
      where: { id: "user_default" },
      update: updateData,
      create: {
        id: "user_default",
        name: user.name || "Eduardo Felipe",
        email: user.email || "eduardo.felipe@lifeos.com",
        theme: theme || "dark",
        autoConfirmAiActions: Boolean(autoConfirmAiActions),
        notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : true,
        geminiApiKey: isAdmin && geminiApiKey ? geminiApiKey.trim() : null,
        groqApiKey: isAdmin && groqApiKey ? groqApiKey.trim() : null,
        aiProvider: isAdmin && aiProvider ? aiProvider : "HYBRID",
      },
    });

    return NextResponse.json({
      ...updated,
      isAdmin,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar configurações." }, { status: 500 });
  }
}
