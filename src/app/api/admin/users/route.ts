/**
 * @file route.ts (API /api/admin/users)
 * @description Gestão administrativa de usuários integrada ao Supabase Auth e Prisma.
 * Criação de novos perfis com provisionamento em `auth.users` e sincronização no banco.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword, isValidUsernameOrEmail } from "@/lib/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

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
 * Cria um novo usuário no Supabase Auth e no banco de dados.
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

    let supabaseUserId: string | null = null;

    // 1. Criação no Supabase Auth se configurado
    if (isSupabaseConfigured() && cleanEmail.includes("@")) {
      try {
        const { data: sbUser, error: sbError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            name: name.trim(),
            role: userRole,
          },
        });

        if (sbError) {
          console.warn("Supabase Auth warning on createUser:", sbError.message);
        } else if (sbUser?.user) {
          supabaseUserId = sbUser.user.id;
        }
      } catch (sbErr: any) {
        console.warn("Supabase Auth bypass on createUser:", sbErr.message);
      }
    }

    // 2. Persiste no banco de dados local / PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        id: supabaseUserId || undefined,
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
