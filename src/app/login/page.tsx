"use client";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      toast.error("Por favor, preencha o e-mail/usuário e a senha.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha na autenticação.");
      }

      toast.success(`Bem-vindo, ${data.user?.name || "Eduardo Felipe"}! 👋`);
      router.push(from);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10 animate-fade-in">
      {/* Card */}
      <div className="p-8 sm:p-10 rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-primary to-indigo-400 text-white shadow-xl shadow-primary/30 mb-2">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Life OS & IA
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Acesse seu painel com suas credenciais de usuário
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>E-mail ou Nome de Usuário</span>
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => {
                // Disallow spaces and restrict to alphanumeric, dot and @
                const sanitized = e.target.value.replace(/[^a-zA-Z0-9.@]/g, "");
                setLogin(sanitized);
              }}
              placeholder="ex: eduardo.felipe ou eduardo.felipe@lifeos.com"
              disabled={loading}
              className="w-full px-4 py-3 rounded-2xl border border-border/70 bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/40 outline-none font-medium shadow-xs transition-all placeholder:text-muted-foreground/60"
              autoFocus
              autoComplete="username"
            />
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              Permitido apenas letras, números e ponto (.)
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>Senha</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                disabled={loading}
                className="w-full px-4 py-3 pr-11 rounded-2xl border border-border/70 bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/40 outline-none font-medium shadow-xs transition-all placeholder:text-muted-foreground/60"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !login.trim() || !password}
            className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-lg shadow-primary/30 active:scale-[0.98] disabled:opacity-40 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? "Autenticando..." : "Entrar no Sistema"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-xs text-muted-foreground font-medium">
        Life OS • Eduardo Felipe © 2026
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-background via-background/90 to-card/50 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <Suspense fallback={<div className="text-xs text-muted-foreground">Carregando formulário...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
