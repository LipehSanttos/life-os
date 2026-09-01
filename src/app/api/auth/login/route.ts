import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createToken, AUTH_COOKIE_NAME, isValidUsernameOrEmail, hashPassword } from "@/lib/auth";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { login, password } = body;

    if (!login || !password) {
      return NextResponse.json(
        { error: "Por favor, informe seu usuário/e-mail e a senha." },
        { status: 400 }
      );
    }

    const validation = isValidUsernameOrEmail(login);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const cleanLogin = login.trim().toLowerCase();

    // 1. Tentativa via Supabase Auth (para logins com e-mail)
    if (isSupabaseConfigured() && cleanLogin.includes("@")) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: sbData, error: sbError } = await supabaseAdmin.auth.signInWithPassword({
          email: cleanLogin,
          password,
        });

        if (sbData?.user && !sbError) {
          // Busca ou cria o registro na tabela User
          let user = await prisma.user.findFirst({ where: { email: cleanLogin } });

          if (!user) {
            // Usuário existe no Auth mas não na tabela — auto-provisionar
            user = await prisma.user.create({
              data: {
                id: sbData.user.id,
                email: cleanLogin,
                name: (sbData.user.user_metadata?.name as string) || cleanLogin.split("@")[0],
                role: (sbData.user.user_metadata?.role as string) || "USER",
                passwordHash: hashPassword(password),
              },
            });
          }

          const token = createToken({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          });

          const response = NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
          });

          response.cookies.set({
            name: AUTH_COOKIE_NAME,
            value: token,
            httpOnly: true,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 dias
          });

          return response;
        }
      } catch (sbErr) {
        // Supabase Auth falhou — tenta autenticação local abaixo
      }
    }

    // 2. Autenticação via tabela User com hash PBKDF2
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanLogin },
          { name: { equals: cleanLogin } },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique os dados digitados." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique os dados digitados." },
        { status: 401 }
      );
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("[auth/login] Erro:", error.message);
    return NextResponse.json(
      { error: "Erro ao processar autenticação." },
      { status: 500 }
    );
  }
}
