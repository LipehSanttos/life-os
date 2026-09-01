import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STATIC_EXTENSIONS = new Set([
  ".ico", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif",
  ".woff", ".woff2", ".ttf", ".eot",
  ".css", ".js", ".map",
  ".json", ".txt", ".xml",
]);

function hasStaticExtension(pathname: string): boolean {
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot === -1) return false;
  const ext = pathname.slice(lastDot).toLowerCase();
  return STATIC_EXTENSIONS.has(ext);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("iteam_auth_token")?.value;

  // Permite acesso irrestrito a arquivos estáticos e rotas de autenticação
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    hasStaticExtension(pathname)
  ) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      // Previne open redirect: só preserva caminhos internos
      const from = pathname;
      if (from.startsWith("/") && !from.startsWith("//")) {
        loginUrl.searchParams.set("from", from);
      }
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image).*)",
  ],
};
