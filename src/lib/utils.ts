/**
 * @file utils.ts
 * @description Funções utilitárias auxiliares de formatação de moeda brasileira (BRL),
 * manipulação de datas com localização em português (pt-BR), cálculo de atrasos e mesclagem de classes CSS (Tailwind).
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isTomorrow, isYesterday, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Mescla classes CSS do Tailwind de forma inteligente eliminando conflitos de especificidade.
 *
 * @param inputs Classes CSS ou condicionais
 * @returns String unificada de classes CSS
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma data no padrão brasileiro especificado.
 *
 * @param dateString Data em string ISO ou objeto Date
 * @param formatStr Padrão de formatação date-fns (padrão: "dd/MM/yyyy")
 * @returns String formatada ou string vazia se inválida
 */
export function formatDate(dateString?: string | Date | null, formatStr: string = "dd/MM/yyyy"): string {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? parseISO(dateString) : dateString;
  if (isNaN(date.getTime())) return "";
  return format(date, formatStr, { locale: ptBR });
}

/**
 * Formata uma data de forma amigável relativa ("Hoje", "Amanhã", "Ontem" ou "d de MMM").
 *
 * @param dateString Data a ser formatada
 * @returns Rótulo amigável em português
 */
export function formatRelativeDate(dateString?: string | Date | null): string {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? parseISO(dateString) : dateString;
  if (isNaN(date.getTime())) return "";

  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  if (isYesterday(date)) return "Ontem";

  return format(date, "d 'de' MMM", { locale: ptBR });
}

/**
 * Formata valores numéricos para o padrão monetário brasileiro (Real - R$).
 *
 * @param value Valor numérico a ser formatado
 * @returns String monetária formatada (ex: "R$ 120,50")
 */
export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Verifica se uma data de vencimento já expirou (está no passado).
 *
 * @param dateString Data a ser verificada
 * @param status Status atual da tarefa ou conta (COMPLETED, PAID, etc.)
 * @returns Booleano indicando se está atrasado
 */
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

/**
 * Retorna o rótulo em português para o nível de prioridade.
 *
 * @param priority Prioridade ("URGENT", "HIGH", "MEDIUM", "LOW")
 * @returns Rótulo em português ("Urgente", "Alta", "Média", "Baixa")
 */
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

/**
 * Retorna as classes Tailwind de cores correspondentes à prioridade.
 *
 * @param priority Prioridade da tarefa
 * @returns Classes de cores de texto, fundo e borda
 */
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

/**
 * Retorna o conjunto completo de estilos e indicadores visuais para a prioridade.
 *
 * @param priority Nível de prioridade
 * @returns Objeto com label, classes de cor, badge e indicador pontual
 */
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
