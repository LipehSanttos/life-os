"use client";
import React, { useEffect, useState } from "react";
import { Search, Bell, Sun, Moon, Sparkles, Menu, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface TopbarProps {
  onOpenSearch: () => void;
  onOpenTaskModal: () => void;
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenSearch, onOpenMobileMenu }: TopbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    fetch("/api/tasks?timeFrame=overdue")
      .then((r) => r.json())
      .then((data) => setNotifications(data || []))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.info("Você saiu da conta.");
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 md:px-8 border-b border-border/40 bg-card/60 backdrop-blur-xl">
      {/* Left: Mobile Menu & Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground md:hidden transition-colors"
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenSearch}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/60 bg-background/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground text-sm transition-all w-56 sm:w-80 md:w-96 shadow-xs group"
        >
          <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="flex-1 text-left truncate text-sm font-medium">Buscar tarefas, projetos, contas...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-semibold bg-muted border border-border/60 rounded-md text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick actions without duplication */}
      <div className="flex items-center gap-2">
        <Link
          href="/chat"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-semibold shadow-xs transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-indigo-400" />
          <span>Falar com a IA</span>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/50"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-card animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 rounded-2xl border border-border/70 bg-card text-card-foreground shadow-2xl z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                <span className="font-bold text-sm text-foreground">Avisos & Lembretes</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/25">
                  {notifications.length} atrasadas
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    🎉 Nenhuma tarefa atrasada!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm flex flex-col gap-1"
                    >
                      <span className="font-semibold text-rose-400">{n.title}</span>
                      <span className="text-xs text-muted-foreground">
                        Prazo era: {formatDate(n.dueDate)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2.5 rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/50"
            title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        )}

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="p-2.5 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors border border-transparent hover:border-rose-500/20"
          title="Encerrar sessão / Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
