"use client";
import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sun, CheckCircle2, Clock } from "lucide-react";

interface DailyGreetingProps {
  userName?: string;
  todayCount: number;
  highCount: number;
  overdueCount: number;
}

export function DailyGreeting({
  userName,
  todayCount,
  highCount,
  overdueCount,
}: DailyGreetingProps) {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  const dateStr = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 backdrop-blur-xl glow-border">
      {/* Background Decorative Glow */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Greeting & Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide capitalize">
            <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
            <span>{dateStr}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            <span className="text-gradient">{greeting}{userName ? <>, <span className="text-gradient-primary">{userName}</span></> : ""}! 👋</span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {overdueCount > 0 ? (
              <span className="text-rose-400 font-semibold">
                ⚠️ Você tem {overdueCount} {overdueCount === 1 ? "tarefa atrasada" : "tarefas atrasadas"} precisando de atenção.
              </span>
            ) : todayCount > 0 ? (
              <span>
                Você tem <strong>{todayCount} {todayCount === 1 ? "tarefa planejada" : "tarefas planejadas"}</strong> para o seu dia.
              </span>
            ) : (
              <span>Todas as atividades em dia! Aproveite para organizar seus próximos projetos ou relaxar.</span>
            )}
          </p>
        </div>

        {/* Right: Summary Metrics Pills */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-background/60 border border-border/30 glow-border-hover">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-semibold">Hoje</span>
              <span className="text-base font-black text-foreground">{todayCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-background/60 border border-border/30 glow-border-hover">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-semibold">Prioritárias</span>
              <span className="text-base font-black text-rose-500">{highCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
