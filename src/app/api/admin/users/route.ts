/**
 * @file route.ts (API /api/admin/users)
 * @description Gestão administrativa de usuários: listagem e criação de novos perfis.
 * Protegido exclusivamente para usuários com papel `ADMIN`. Garante que novas contas
 * iniciem com perfil 100% novo e limpo (zero registros vinculados).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword, isValidUsernameOrEmail } from "@/lib/auth";

/**
 * GET /api/admin/users
 * Lista todos os usuários cadastrados na plataforma (restrito a ADMIN).
 */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem visualizar os usuários." },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao carregar usuários." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Cria um novo perfil de usuário com validação de formato de login e senha criptografada.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem criar novos perfis." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "O nome do usuário é obrigatório." }, { status: 400 });
    }

    const validation = isValidUsernameOrEmail(email);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "A senha inicial deve conter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRole = role === "ADMIN" ? "ADMIN" : "USER";

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um usuário cadastrado com este e-mail/usuário." },
        { status: 400 }
      );
    }

    // Cria o usuário completamente limpo (sem nenhuma tarefa pré-existente)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash: hashPassword(password),
        role: userRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao criar novo usuário." },
      { status: 500 }
    );
  }
}
