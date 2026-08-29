"use client";
import React, { useState } from "react";
import { Check, X, Sparkles, Calendar, DollarSign, CalendarPlus, ExternalLink } from "lucide-react";
import { PendingAction } from "@/types";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendar";

interface ActionConfirmationCardProps {
  messageId: string;
  action: PendingAction;
  onActionHandled: () => void;
}

export function ActionConfirmationCard({ messageId, action, onActionHandled }: ActionConfirmationCardProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [syncGoogleCalendar, setSyncGoogleCalendar] = useState(true);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState<string | null>(null);

  const isEventOrTask =
    action.type === "CREATE_TASK" ||
    action.type === "UPDATE_TASK" ||
    action.payload?.dueDate !== undefined;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, action, confirmed: true }),
      });

      if (res.ok) {
        setConfirmed(true);

        // If Google Agenda was requested and date exists, prepare URL
        if (action.payload?.dueDate) {
          const gCalUrl = generateGoogleCalendarUrl({
            title: action.payload.title || action.title,
            description: action.payload.description || action.summary,
            dueDate: action.payload.dueDate,
            dueTime: action.payload.dueTime,
          });
          setGoogleCalendarUrl(gCalUrl);

          if (syncGoogleCalendar) {
            window.open(gCalUrl, "_blank", "noopener,noreferrer");
            toast.success("Agendado no Life OS e aberto no Google Agenda! 📅");
          } else {
            toast.success("Agendamento confirmado no Life OS!");
          }
        } else {
          toast.success("Ação confirmada e registrada com sucesso!");
        }

        onActionHandled();
      }
    } catch (err) {
      toast.error("Erro ao confirmar ação.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, action, confirmed: false }),
      });
      if (res.ok) {
        setCancelled(true);
        toast.info("Agendamento cancelado.");
        onActionHandled();
      }
    } catch (err) {
      toast.error("Erro ao cancelar ação.");
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="p-4 my-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-400 space-y-2 font-medium animate-fade-in">
        <div className="flex items-center gap-2.5">
          <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
          <span className="font-bold">Agendamento confirmado com sucesso no Life OS!</span>
        </div>
        {googleCalendarUrl && (
          <div className="pt-1 flex items-center gap-2">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold transition-all border border-blue-500/30"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Ver no Google Agenda</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="p-3.5 my-2 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2.5 animate-fade-in">
        <X className="w-4 h-4 stroke-[2.5]" />
        <span>Agendamento cancelado pelo usuário.</span>
      </div>
    );
  }

  return (
    <div className="my-3 p-5 rounded-3xl border-2 border-indigo-500/40 bg-card/95 shadow-xl text-card-foreground space-y-4 animate-fade-in backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-400 block">
            Confirmação de Agendamento
          </span>
          <h4 className="text-base font-bold text-foreground">{action.title}</h4>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-muted/60 text-sm space-y-3 border border-border/50">
        <p className="font-medium text-foreground leading-relaxed">{action.summary}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground border-t border-border/40 font-medium">
          {action.payload.dueDate && (
            <div className="flex items-center gap-2 text-primary font-bold">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>
                Data: {formatDate(action.payload.dueDate)} {action.payload.dueTime ? `às ${action.payload.dueTime}` : ""}
              </span>
            </div>
          )}
          {action.payload.amount !== undefined && (
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <DollarSign className="w-4 h-4" />
              <span>Valor: {formatCurrency(action.payload.amount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Google Agenda Integration Checkbox */}
      {action.payload.dueDate && (
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25">
          <label className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={syncGoogleCalendar}
              onChange={(e) => setSyncGoogleCalendar(e.target.checked)}
              className="rounded-md border text-blue-500 focus:ring-blue-500 w-4 h-4"
            />
            <div className="flex items-center gap-1.5">
              <CalendarPlus className="w-4 h-4 text-blue-400" />
              <span>Adicionar e sincronizar lembrete no <strong>Google Agenda</strong></span>
            </div>
          </label>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/80 hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
        >
          <X className="w-4 h-4" />
          <span>Cancelar</span>
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black shadow-md shadow-primary/25 active:scale-95 transition-all"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{loading ? "Confirmando..." : "Confirmar Data & Agendar"}</span>
        </button>
      </div>
    </div>
  );
}
