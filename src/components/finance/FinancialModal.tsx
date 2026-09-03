"use client";
import React, { useState, useEffect } from "react";
import { X, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { FinancialReminderData } from "@/types";

interface FinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  itemToEdit?: FinancialReminderData | null;
}

export function FinancialModal({ isOpen, onClose, onSaved, itemToEdit }: FinancialModalProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setTitle(itemToEdit.title);
        setAmount(itemToEdit.amount ? String(itemToEdit.amount) : "");
        setDueDate(itemToEdit.dueDate ? itemToEdit.dueDate.split("T")[0] : "");
        setIsRecurring(itemToEdit.isRecurring);
        setRecipient(itemToEdit.recipient || "");
      } else {
        setTitle("");
        setAmount("");
        setDueDate(new Date().toISOString().split("T")[0]);
        setIsRecurring(false);
        setRecipient("");
      }
    }
  }, [isOpen, itemToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return toast.error("Título e data são obrigatórios.");

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        amount: amount ? parseFloat(amount) : null,
        dueDate: new Date(dueDate).toISOString(),
        isRecurring,
        recurrenceRule: isRecurring ? "MONTHLY" : null,
        recipient: recipient.trim() || null,
      };

      const url = itemToEdit ? `/api/finance/${itemToEdit.id}` : "/api/finance";
      const method = itemToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar.");
      toast.success(itemToEdit ? "Conta atualizada!" : "Lembrete financeiro salvo!");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-card/95 backdrop-blur-2xl glow-border shadow-2xl text-card-foreground border border-border/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-500" />
            <h2 className="text-sm font-semibold text-foreground">{itemToEdit ? "Editar Conta" : "Nova Conta"}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Vencimento *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-xs outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/30">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold glow-border-hover shadow-lg shadow-primary/25 active:scale-[0.98] transition-all">
              Salvar Conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
