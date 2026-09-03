"use client";
import React, { useState, Suspense } from "react";
import Image from "next/image";
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
      <div className="p-8 sm:p-10 rounded-xl border border-border/30 bg-card/90 backdrop-blur-2xl glow-border-animated space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl overflow-hidden shadow-xl shadow-primary/25 mb-2 bg-background/80 border border-border/60 p-1.5">
            <Image
              src="/logo.svg"
              alt="Life OS Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain"
              priority
            />
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
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Digite seu e-mail ou nome de usuário"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-border/40 bg-background/80 text-foreground text-xs input-glow outline-none font-medium shadow-xs transition-all placeholder:text-muted-foreground/60"
              autoFocus
              autoComplete="username"
            />
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
                className="w-full px-4 py-3 pr-11 rounded-lg border border-border/40 bg-background/80 text-foreground text-xs input-glow outline-none font-medium shadow-xs transition-all placeholder:text-muted-foreground/60"
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
            className="w-full py-3.5 rounded-lg bg-primary hover:bg-primary/90 glow-border-hover text-primary-foreground font-black text-xs shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-40 transition-all flex items-center justify-center gap-2 mt-2"
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-background via-background/90 to-card/50 relative overflow-hidden grain-overlay">
      {/* Grid Lines Background */}
      <div className="absolute inset-0 grid-lines pointer-events-none" />

      {/* Animated Spotlights */}
      <div
        className="spotlight top-0 left-1/4 -translate-x-1/2"
        style={{
          "--spotlight-start": "-25deg",
          "--spotlight-end": "15deg",
          "--spotlight-duration": "7s",
        } as React.CSSProperties}
      />
      <div
        className="spotlight top-0 left-1/2 -translate-x-1/2"
        style={{
          "--spotlight-start": "-10deg",
          "--spotlight-end": "25deg",
          "--spotlight-duration": "9s",
        } as React.CSSProperties}
      />
      <div
        className="spotlight top-0 right-1/4 translate-x-1/2"
        style={{
          "--spotlight-start": "-20deg",
          "--spotlight-end": "20deg",
          "--spotlight-duration": "11s",
        } as React.CSSProperties}
      />

      <Suspense fallback={<div className="text-xs text-muted-foreground">Carregando formulário...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
