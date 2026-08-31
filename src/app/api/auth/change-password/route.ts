import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Você precisa estar autenticado para alterar sua senha." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Por favor, preencha todos os campos de senha." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "A confirmação da nova senha não confere com a nova senha." },
        { status: 400 }
      );
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // Validação da senha atual contra o hash armazenado
    const isCurrentValid = verifyPassword(currentPassword, fullUser.passwordHash);

    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "A senha atual informada está incorreta." },
        { status: 400 }
      );
    }

    // 1. Atualiza no Supabase Auth se configurado
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: newPassword,
        });
      } catch (sbErr: any) {
        console.warn("Supabase Auth warning on change-password:", sbErr.message);
      }
    }

    // 2. Atualiza no banco de dados local / PostgreSQL
    const newHash = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Senha alterada com sucesso! Sua nova senha já está ativa.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao alterar a senha." },
      { status: 500 }
    );
  }
}
