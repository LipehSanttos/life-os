"use client";
import React, { useEffect, useState } from "react";
import { Search, Bell, Sun, Moon, Sparkles, Menu, LogOut, Cake, AlertTriangle, DollarSign } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { sendBrowserNotification, requestBrowserNotificationPermission } from "@/lib/notifications";

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
  const [data, setData] = useState<{
    totalCount: number;
    birthdays: any[];
    overdueTasks: any[];
    bills: any[];
  }>({
    totalCount: 0,
    birthdays: [],
    overdueTasks: [],
    bills: [],
  });

  useEffect(() => {
    setMounted(true);
    requestBrowserNotificationPermission();

    fetch("/api/notifications")
      .then((r) => r.json())
      .then((res) => {
        if (res && res.totalCount !== undefined) {
          setData(res);

          // Notifica nativamente se tiver aniversário hoje
          const todayBirthdays = (res.birthdays || []).filter((b: any) => b.isToday);
          if (todayBirthdays.length > 0) {
            todayBirthdays.forEach((b: any) => {
              sendBrowserNotification(`🎂 Hoje é Aniversário!`, {
                body: `Parabenize: ${b.title}! 🎉`,
              });
            });
          }
        }
      })
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

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/chat"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-semibold shadow-xs transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-indigo-400" />
          <span>Falar com a IA</span>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/50"
            title="Central de Avisos e Aniversários"
          >
            <Bell className="w-4 h-4" />
            {data.totalCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-card animate-pulse">
                {data.totalCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 rounded-2xl border border-border/70 bg-card text-card-foreground shadow-2xl z-50 animate-fade-in max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                <span className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Avisos & Notificações
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  {data.totalCount} {data.totalCount === 1 ? "alerta" : "alertas"}
                </span>
              </div>

              <div className="space-y-4">
                {data.totalCount === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    🎉 Tudo em dia! Sem aniversários próximos ou tarefas atrasadas.
                  </div>
                ) : (
                  <>
                    {/* Aniversários Próximos */}
                    {data.birthdays.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                          <Cake className="w-3.5 h-3.5" />
                          <span>Aniversários Próximos ({data.birthdays.length})</span>
                        </div>
                        {data.birthdays.map((b) => (
                          <div
                            key={b.id}
                            className={`p-3 rounded-xl border text-sm flex items-start justify-between gap-2 transition-all ${
                              b.isToday
                                ? "bg-rose-500/20 border-rose-500/50 shadow-xs shadow-rose-500/10"
                                : "bg-rose-500/10 border-rose-500/20"
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-rose-300 flex items-center gap-1.5">
                                🎂 {b.title}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Data: {b.formattedDate}
                              </span>
                            </div>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                b.isToday
                                  ? "bg-rose-500 text-white animate-pulse"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {b.statusText}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tarefas Atrasadas */}
                    {data.overdueTasks.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Tarefas Atrasadas ({data.overdueTasks.length})</span>
                        </div>
                        {data.overdueTasks.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm flex flex-col gap-1"
                          >
                            <span className="font-semibold text-amber-300">{t.title}</span>
                            <span className="text-xs text-muted-foreground">
                              Prazo era: {formatDate(t.dueDate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Contas a Pagar Próximas */}
                    {data.bills.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Contas com Vencimento Próximo ({data.bills.length})</span>
                        </div>
                        {data.bills.map((bill) => (
                          <div
                            key={bill.id}
                            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm flex items-center justify-between gap-2"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-emerald-300">{bill.title}</span>
                              <span className="text-xs text-muted-foreground">
                                Vencimento: {formatDate(bill.dueDate)}
                              </span>
                            </div>
                            {bill.amount > 0 && (
                              <span className="text-xs font-bold text-emerald-400">
                                {formatCurrency(bill.amount)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
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
