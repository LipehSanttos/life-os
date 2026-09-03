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

    // Busca o usuário na tabela User para resolver e-mail e dados locais
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanLogin },
          { name: { equals: cleanLogin } },
        ],
      },
    }).catch(() => null);

    const targetEmail = cleanLogin.includes("@") ? cleanLogin : existingUser?.email;

    // 1. Tentativa de autenticação via Supabase Auth
    if (isSupabaseConfigured() && targetEmail) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: sbData, error: sbError } = await supabaseAdmin.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (sbData?.user && !sbError) {
          let user = existingUser;

          if (!user) {
            user = await prisma.user.findFirst({ where: { email: targetEmail } });
          }

          if (!user) {
            // Auto-provisionar registro na tabela User caso exista apenas no Auth
            user = await prisma.user.create({
              data: {
                id: sbData.user.id,
                email: targetEmail,
                name: (sbData.user.user_metadata?.name as string) || targetEmail.split("@")[0],
                role: (sbData.user.user_metadata?.role as string) || "USER",
                passwordHash: hashPassword(password),
              },
            });
          } else if (user.passwordHash === "managed_by_supabase_auth") {
            // Sincroniza o hash local para permitir login offline / fallback
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: hashPassword(password) },
            }).catch(() => null);
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
        } else if (sbError) {
          console.warn("[auth/login] Supabase Auth aviso:", sbError.message);
        }
      } catch (sbErr: any) {
        console.warn("[auth/login] Falha ao conectar no Supabase Auth:", sbErr.message);
      }
    }

    // 2. Autenticação de contingência via hash PBKDF2 na tabela User
    if (existingUser) {
      const isValid = verifyPassword(password, existingUser.passwordHash);
      if (isValid) {
        const token = createToken({
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
        });

        const response = NextResponse.json({
          success: true,
          user: { id: existingUser.id, name: existingUser.name, email: existingUser.email, role: existingUser.role },
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
      }
    }

    return NextResponse.json(
      { error: "Credenciais inválidas. Verifique seu e-mail/usuário e senha digitados." },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("[auth/login] Erro interno:", error.message);
    return NextResponse.json(
      { error: "Erro ao processar autenticação. Tente novamente." },
      { status: 500 }
    );
  }
}
