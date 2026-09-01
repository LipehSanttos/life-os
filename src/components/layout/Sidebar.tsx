"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sun,
  CalendarDays,
  Inbox,
  Calendar,
  FolderKanban,
  GraduationCap,
  DollarSign,
  BookOpen,
  Tags,
  BotMessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryData } from "@/types";
import { toast } from "sonner";

interface SidebarProps {
  onOpenTaskModal: () => void;
}

export function Sidebar({ onOpenTaskModal }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [stats, setStats] = useState<any>({ todayCount: 0, overdueCount: 0, inboxCount: 0 });
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const loadSidebarData = async () => {
      try {
        const [catsRes, statsRes, inboxRes, meRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/stats"),
          fetch("/api/tasks?isInbox=true&status=PENDING"),
          fetch("/api/auth/me"),
        ]);
        if (catsRes.ok) setCategories(await catsRes.json());
        if (statsRes.ok) {
          const st = await statsRes.json();
          setStats((prev: any) => ({ ...prev, ...st }));
        }
        if (inboxRes.ok) {
          const inboxTasks = await inboxRes.json();
          setStats((prev: any) => ({ ...prev, inboxCount: inboxTasks.length }));
        }
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) setCurrentUser(meData.user);
        }
      } catch (e) {
        console.error("Sidebar load error:", e);
      }
    };
    loadSidebarData();
  }, [pathname]);

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

  const mainNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Hoje", href: "/today", icon: Sun, badge: stats.todayCount > 0 ? stats.todayCount : null, badgeColor: "bg-amber-500/15 text-amber-500 border border-amber-500/20" },
    { label: "Próximos Dias", href: "/upcoming", icon: CalendarDays },
    { label: "Inbox", href: "/inbox", icon: Inbox, badge: stats.inboxCount > 0 ? stats.inboxCount : null, badgeColor: "bg-blue-500/15 text-blue-500 border border-blue-500/20" },
    { label: "Calendário", href: "/calendar", icon: Calendar },
    { label: "Projetos", href: "/projects", icon: FolderKanban },
    { label: "Estudos & Faculdade", href: "/studies", icon: GraduationCap },
    { label: "Finanças & Contas", href: "/finance", icon: DollarSign, badge: stats.overdueCount > 0 ? "Atrasadas" : null, badgeColor: "bg-rose-500/15 text-rose-500 border border-rose-500/20" },
    { label: "Leitura & Livros", href: "/reading", icon: BookOpen },
    { label: "Categorias", href: "/categories", icon: Tags },
    { label: "Assistente IA", href: "/chat", icon: BotMessageSquare, highlight: true },
  ];

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border/50 bg-card/70 backdrop-blur-xl transition-all duration-300 z-30 h-screen select-none",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/40">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-primary/20 flex-shrink-0 bg-background/80 border border-border/40 p-1">
            <Image
              src="/logo.svg"
              alt="Life OS Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight text-foreground flex items-center gap-1.5">
                Life OS
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25">
                  AI
                </span>
              </span>
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[130px]">
                {currentUser?.name || "Organizador"}
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors hidden md:flex"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Action Button */}
      <div className="p-3">
        <button
          onClick={onOpenTaskModal}
          className={cn(
            "flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg active:scale-[0.98] transition-all",
            collapsed && "px-0"
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0 stroke-[3]" />
          {!collapsed && <span>Nova Tarefa</span>}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 py-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary/15 text-primary font-bold border border-primary/25 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                item.highlight && !isActive && "text-indigo-400 hover:text-indigo-300 font-semibold"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-primary stroke-[2.5]" : item.highlight ? "text-indigo-400" : "text-muted-foreground"
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", item.badgeColor)}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Admin Section */}
        {currentUser?.role === "ADMIN" && (
          <div className="pt-2">
            <Link
              href="/admin/users"
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group",
                pathname.startsWith("/admin")
                  ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 shadow-xs"
                  : "text-purple-400/90 hover:text-purple-300 hover:bg-purple-500/10"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <ShieldCheck
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110",
                    pathname.startsWith("/admin") ? "text-purple-400 stroke-[2.5]" : "text-purple-400"
                  )}
                />
                {!collapsed && <span className="truncate">Gestão de Usuários</span>}
              </div>

              {!collapsed && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Admin
                </span>
              )}
            </Link>
          </div>
        )}

        {/* Categories Section */}
        {!collapsed && categories.length > 0 && (
          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Categorias
              </span>
              <Link href="/categories" className="text-xs font-semibold text-primary hover:underline">
                Gerenciar
              </Link>
            </div>
            <div className="space-y-0.5">
              {categories.slice(0, 7).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/today?categoryId=${cat.id}`}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  {cat._count?.tasks && cat._count.tasks > 0 ? (
                    <span className="text-xs font-medium text-muted-foreground/80 px-2 py-0.5 rounded-md bg-muted">
                      {cat._count.tasks}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/40 mt-auto space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all",
            pathname === "/settings" && "bg-primary/15 text-primary font-bold border border-primary/20"
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="truncate">Configurações</span>}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
