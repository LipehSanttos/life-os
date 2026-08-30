"use client";
import React, { useState } from "react";
import { Check, X, Sparkles, Calendar, DollarSign } from "lucide-react";
import { PendingAction } from "@/types";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ActionConfirmationCardProps {
  messageId: string;
  action: PendingAction;
  onActionHandled: () => void;
}

export function ActionConfirmationCard({ messageId, action, onActionHandled }: ActionConfirmationCardProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [cancelled, setCancelled] = useState(false);

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
        toast.success("Ação confirmada e registrada com sucesso no Life OS!");
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
        toast.info("Ação cancelada.");
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
      <div className="p-4 my-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-400 font-medium animate-fade-in flex items-center gap-2.5">
        <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
        <span className="font-bold">Ação confirmada e registrada com sucesso no Life OS!</span>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="p-3.5 my-2 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2.5 animate-fade-in">
        <X className="w-4 h-4 stroke-[2.5]" />
        <span>Ação cancelada pelo usuário.</span>
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
            Confirmação de Ação
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
          <span>{loading ? "Confirmando..." : "Confirmar"}</span>
        </button>
      </div>
    </div>
  );
}
