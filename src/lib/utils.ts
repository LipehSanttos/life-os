import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isTomorrow, isYesterday, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | Date | null, formatStr: string = "dd/MM/yyyy"): string {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? parseISO(dateString) : dateString;
  if (isNaN(date.getTime())) return "";
  return format(date, formatStr, { locale: ptBR });
}

export function formatRelativeDate(dateString?: string | Date | null): string {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? parseISO(dateString) : dateString;
  if (isNaN(date.getTime())) return "";

  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  if (isYesterday(date)) return "Ontem";

  return format(date, "d 'de' MMM", { locale: ptBR });
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function isDateOverdue(dateString?: string | Date | null, status?: string): boolean {
  if (!dateString || status === "COMPLETED" || status === "CANCELLED" || status === "PAID") {
    return false;
  }
  const date = typeof dateString === "string" ? parseISO(dateString) : dateString;
  if (isNaN(date.getTime())) return false;
  const endOfTargetDate = new Date(date);
  endOfTargetDate.setHours(23, 59, 59, 999);
  return isPast(endOfTargetDate);
}

export function getPriorityLabel(priority?: string): string {
  switch (priority?.toUpperCase()) {
    case "URGENT":
      return "Urgente";
    case "HIGH":
      return "Alta";
    case "MEDIUM":
      return "Média";
    case "LOW":
    default:
      return "Baixa";
  }
}

export function getPriorityColor(priority?: string): string {
  switch (priority?.toUpperCase()) {
    case "URGENT":
      return "text-rose-500 bg-rose-500/10 border-rose-500/30";
    case "HIGH":
      return "text-amber-500 bg-amber-500/10 border-amber-500/30";
    case "MEDIUM":
      return "text-blue-500 bg-blue-500/10 border-blue-500/30";
    case "LOW":
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/30";
  }
}

export function getPriorityInfo(priority?: string) {
  switch (priority?.toUpperCase()) {
    case "URGENT":
      return {
        label: "Urgente",
        color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
        badge: "bg-rose-500 text-white",
        dot: "bg-rose-500",
      };
    case "HIGH":
      return {
        label: "Alta",
        color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
        badge: "bg-amber-500 text-white",
        dot: "bg-amber-500",
      };
    case "MEDIUM":
      return {
        label: "Média",
        color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
        badge: "bg-blue-500 text-white",
        dot: "bg-blue-500",
      };
    case "LOW":
    default:
      return {
        label: "Baixa",
        color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
        badge: "bg-slate-500 text-white",
        dot: "bg-slate-400",
      };
  }
}
