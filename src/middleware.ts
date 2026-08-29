/**
 * @file middleware.ts
 * @description Middleware global do Next.js para interceptação de requisições,
 * proteção de rotas privadas, verificação de cookies de sessão e redirecionamento automático.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Intercepta todas as requisições HTTP antes de renderizar páginas ou executar rotas.
 *
 * @param request Requisição HTTP do Next.js
 * @returns Resposta HTTP (prosseguir ou redirecionar para /login ou /dashboard)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("iteam_auth_token")?.value;

  // Permite acesso irrestrito a arquivos estáticos, imagens, favicon e rotas de login/logout da API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes("favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/login";

  // Se o usuário já estiver autenticado e tentar acessar a página de login, redireciona para o Dashboard
  if (isLoginPage) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Se não possuir token de sessão, redireciona para /login preservando a rota de origem no parâmetro 'from'
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/** Configuração dos caminhos capturados pelo Middleware */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
