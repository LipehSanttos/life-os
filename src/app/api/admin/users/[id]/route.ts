/**
 * @file route.ts (API /api/admin/users/[id])
 * @description Operações administrativas sobre um usuário específico: atualização de nome,
 * alteração de papel (ADMIN/USER), redefinição de senha e exclusão no Supabase Auth e Prisma.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

/**
 * PATCH /api/admin/users/[id]
 * Atualiza dados, papel ou senha do usuário no Supabase Auth e no banco.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem alterar perfis." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { name, email, role, password } = body;

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const updateData: any = {};
    const supabaseUpdateAttrs: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
      supabaseUpdateAttrs.user_metadata = {
        ...(supabaseUpdateAttrs.user_metadata || {}),
        name: name.trim(),
      };
    }

    if (email && email.trim() && email.includes("@")) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== existing.email) {
        const collision = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (collision) {
          return NextResponse.json({ error: "E-mail já utilizado por outro usuário." }, { status: 400 });
        }
        updateData.email = cleanEmail;
        supabaseUpdateAttrs.email = cleanEmail;
      }
    }

    if (role && (role === "ADMIN" || role === "USER")) {
      if (existing.id === admin.id && role !== "ADMIN") {
        return NextResponse.json(
          { error: "Você não pode revogar seu próprio privilégio de Administrador." },
          );
      }
      updateData.role = role;
      supabaseUpdateAttrs.user_metadata = {
        ...(supabaseUpdateAttrs.user_metadata || {}),
        role,
      };
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve ter pelo menos 6 caracteres." },
          { status: 400 }
        );
      }
      updateData.passwordHash = hashPassword(password.trim());
      supabaseUpdateAttrs.password = password.trim();
    }

    // 1. Atualiza no Supabase Auth se configurado
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(id, supabaseUpdateAttrs);
      } catch (sbErr: any) {
        console.warn("Supabase Auth warning on updateUserById:", sbErr.message);
      }
    }

    // 2. Atualiza no banco de dados
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar usuário." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Exclui permanentemente o usuário do Supabase Auth e do banco de dados.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem remover usuários." },
        { status: 403 }
      );
    }

    const { id } = params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "Você não pode excluir sua própria conta de administrador." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // 1. Exclui do Supabase Auth se configurado
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(id);
      } catch (sbErr: any) {
        console.warn("Supabase Auth warning on deleteUser:", sbErr.message);
      }
    }

    // 2. Exclui do banco de dados
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Usuário excluído com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao excluir usuário." },
      { status: 500 }
    );
  }
}
