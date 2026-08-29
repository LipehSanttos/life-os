"use client";
import React, { useState, useEffect } from "react";
import { Settings, User, Moon, Sun, Sparkles, Key, Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, ShieldCheck, Cpu, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // Profile & System settings state
  const [name, setName] = useState("Eduardo Felipe");
  const [email, setEmail] = useState("eduardo.felipe@lifeos.com");
  const [autoConfirmAiActions, setAutoConfirmAiActions] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState<"HYBRID" | "GEMINI" | "GROQ">("HYBRID");
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setName(data.name || "Eduardo Felipe");
          setEmail(data.email || "eduardo.felipe@lifeos.com");
          setAutoConfirmAiActions(Boolean(data.autoConfirmAiActions));
          setGeminiApiKey(data.geminiApiKey || "");
          setGroqApiKey(data.groqApiKey || "");
          setAiProvider(data.aiProvider || "HYBRID");
        }
      });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          autoConfirmAiActions,
          geminiApiKey,
          groqApiKey,
          aiProvider,
        }),
      });
      if (res.ok) toast.success("Configurações e chaves de IA salvas com sucesso!");
    } catch (e) {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos para alterar sua senha.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("A confirmação não confere com a nova senha digitada.");
      return;
    }

    setLoadingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao alterar a senha.");
      }

      toast.success("Senha alterada com sucesso! Utilize sua nova senha.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Falha ao alterar a senha.");
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="p-6 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1.5">
          <Settings className="w-4 h-4" />
          <span>Preferências & Inteligência Artificial</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Configurações
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
          Personalize seu perfil, altere sua senha e configure os motores de IA (Google Gemini e Groq).
        </p>
      </div>

      {/* Security & Password Section */}
      <div className="p-6 rounded-3xl border-2 border-primary/30 bg-card/90 backdrop-blur-xl shadow-lg space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/15 text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Segurança & Alteração de Senha</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Altere sua senha de acesso a qualquer momento
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
            Acesso Seguro
          </span>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Senha Atual *</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Nova Senha *</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Confirmar Nova Senha *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={loadingPassword || !currentPassword || !newPassword}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black shadow-md shadow-primary/25 disabled:opacity-40 active:scale-95 transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loadingPassword ? "Atualizando..." : "Atualizar Senha"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Details */}
        <div className="p-6 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Perfil</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Nome de Usuário</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="p-6 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Sun className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Aparência & Tema</h3>
          </div>
          <div className="grid grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-2xl border text-center transition-all ${
                theme === "dark"
                  ? "bg-primary/15 border-primary ring-2 ring-primary/20 text-foreground"
                  : "bg-card/70 border-border/60 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Moon className="w-5 h-5 mx-auto text-indigo-400 mb-1.5" />
              <span className="block text-xs font-bold">Escuro</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-4 rounded-2xl border text-center transition-all ${
                theme === "light"
                  ? "bg-primary/15 border-primary ring-2 ring-primary/20 text-foreground"
                  : "bg-card/70 border-border/60 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Sun className="w-5 h-5 mx-auto text-amber-500 mb-1.5" />
              <span className="block text-xs font-bold">Claro</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`p-4 rounded-2xl border text-center transition-all ${
                theme === "system"
                  ? "bg-primary/15 border-primary ring-2 ring-primary/20 text-foreground"
                  : "bg-card/70 border-border/60 hover:bg-muted text-muted-foreground"
              }`}
            >
              <Settings className="w-5 h-5 mx-auto text-muted-foreground mb-1.5" />
              <span className="block text-xs font-bold">Sistema</span>
            </button>
          </div>
        </div>

        {/* AI Engine & Providers (Gemini & Groq) */}
        <div className="p-6 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Inteligência Artificial & Motores de Inferência
            </h3>
          </div>

          {/* AI Provider Selector Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-foreground">Motor de IA Preferencial</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAiProvider("HYBRID")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  aiProvider === "HYBRID"
                    ? "bg-primary/15 border-primary ring-2 ring-primary/20"
                    : "bg-card/70 border-border/60 hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
                  <Zap className="w-4 h-4" />
                  <span>Híbrido Inteligente</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Alterna automaticamente entre Gemini e Groq com máxima disponibilidade.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAiProvider("GROQ")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  aiProvider === "GROQ"
                    ? "bg-primary/15 border-primary ring-2 ring-primary/20"
                    : "bg-card/70 border-border/60 hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs mb-1">
                  <Cpu className="w-4 h-4" />
                  <span>Groq (LLaMA 3.3)</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Velocidade ultra-rápida de inferência em LPUs (70B / 8B).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAiProvider("GEMINI")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  aiProvider === "GEMINI"
                    ? "bg-primary/15 border-primary ring-2 ring-primary/20"
                    : "bg-card/70 border-border/60 hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Google Gemini</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Raciocínio profundo com modelo Gemini 3.6 Flash.
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Groq API Key Input */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-500" />
                <span>Chave de API Groq (Opcional - LLaMA 3.3 70B / 3.1 8B)</span>
              </label>
              <input
                type="password"
                placeholder="gsk_..."
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono shadow-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                Obtenha gratuitamente em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">console.groq.com</a>.
              </p>
            </div>

            {/* Google Gemini API Key Input */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-primary" />
                <span>Chave de API Google Gemini (Opcional)</span>
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono shadow-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                Caso não possua chaves externas, o sistema utiliza o motor inteligente NLP local em português.
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoConfirmAiActions}
                  onChange={(e) => setAutoConfirmAiActions(e.target.checked)}
                  className="rounded-md border text-primary focus:ring-primary w-4 h-4"
                />
                <span>Executar ações da IA automaticamente (sem exibir o cartão de confirmação prévia)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loadingProfile}
            className="px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black shadow-lg shadow-primary/25 active:scale-95 transition-all"
          >
            {loadingProfile ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </form>
    </div>
  );
}
