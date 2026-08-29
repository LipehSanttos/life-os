"use client";
import React, { useState, useEffect } from "react";
import { DollarSign, Plus, CheckCircle2, Clock, AlertCircle, RefreshCw, Trash2, Calendar } from "lucide-react";
import { FinancialReminderData } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function FinancePage() {
  const [reminders, setReminders] = useState<FinancialReminderData[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/finance");
      if (res.ok) {
        const data = await res.json();
        const items: FinancialReminderData[] = data.reminders || [];
        setReminders(items);

        // Fallback computation ensures value is never 0 when items exist
        const computedPending =
          data.totalPending ??
          data.pendingTotal ??
          data.summary?.pendingTotal ??
          items
            .filter((r) => r.status === "PENDING" || r.status === "OVERDUE")
            .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

        const computedPaid =
          data.totalPaid ??
          data.paidTotal ??
          data.summary?.paidTotal ??
          items
            .filter((r) => r.status === "PAID")
            .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

        setTotalPending(Number(computedPending) || 0);
        setTotalPaid(Number(computedPaid) || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !dueDate) {
      toast.error("Preencha descrição, valor e data de vencimento.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: parseFloat(amount),
          dueDate: new Date(`${dueDate}T12:00:00Z`).toISOString(),
          isRecurring,
          recipient: recipient.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar conta.");

      toast.success("Conta cadastrada com sucesso!");
      setTitle("");
      setAmount("");
      setDueDate("");
      setRecipient("");
      setIsRecurring(false);
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePaid = async (item: FinancialReminderData) => {
    const nextStatus = item.status === "PAID" ? "PENDING" : "PAID";
    try {
      await fetch(`/api/finance/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(nextStatus === "PAID" ? "Conta marcada como paga! 💰" : "Conta reaberta como pendente.");
      loadData();
    } catch (e) {
      toast.error("Erro ao atualizar conta.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta conta?")) return;

    try {
      await fetch(`/api/finance/${id}`, { method: "DELETE" });
      toast.success("Conta removida com sucesso.");
      loadData();
    } catch {
      toast.error("Erro ao excluir conta.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
            <DollarSign className="w-5 h-5 text-teal-400" />
            <span>Controle Financeiro & Contas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Finanças & Contas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Acompanhe contas a pagar, faturas mensais, controle os vencimentos e mantenha seu saldo organizado.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md shadow-primary/25 active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nova Conta</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Total Pendente</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-500">{formatCurrency(totalPending)}</div>
          <p className="text-xs text-muted-foreground font-medium">
            {reminders.filter((r) => r.status !== "PAID").length} {reminders.filter((r) => r.status !== "PAID").length === 1 ? "conta pendente" : "contas pendentes"}
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Pago</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-500">{formatCurrency(totalPaid)}</div>
          <p className="text-xs text-muted-foreground font-medium">
            {reminders.filter((r) => r.status === "PAID").length} {reminders.filter((r) => r.status === "PAID").length === 1 ? "conta quitada" : "contas quitadas"}
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs space-y-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total de Registros</span>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{reminders.length}</div>
          <p className="text-xs text-muted-foreground font-medium">Contas e lembretes cadastrados</p>
        </div>
      </div>

      {/* Bills List */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs space-y-4">
        <h2 className="font-bold text-base text-foreground pb-3 border-b border-border/40">
          Todas as Contas ({reminders.length})
        </h2>

        {reminders.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground font-medium">
            🎉 Nenhuma conta cadastrada. Clique em <strong>"Nova Conta"</strong> para registrar seus pagamentos.
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((item) => {
              const isPaid = item.status === "PAID";
              const isOverdue = !isPaid && item.dueDate && new Date(item.dueDate) < new Date();

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    isPaid
                      ? "bg-muted/30 border-border/40 opacity-75"
                      : isOverdue
                      ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500/60"
                      : "bg-card/90 border-border/70 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={() => handleTogglePaid(item)}
                      className="p-1 text-muted-foreground hover:text-emerald-500 transition-colors"
                      title={isPaid ? "Marcar como pendente" : "Marcar como paga"}
                    >
                      <CheckCircle2
                        className={`w-6 h-6 ${
                          isPaid ? "text-emerald-500 fill-emerald-500/20" : "text-muted-foreground hover:text-emerald-400"
                        }`}
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-base font-bold ${isPaid ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.title}
                        </span>
                        {item.recipient && (
                          <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted/60">
                            {item.recipient}
                          </span>
                        )}
                        {item.isRecurring && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-[11px] font-bold text-indigo-400 flex items-center gap-1 border border-indigo-500/25">
                            <RefreshCw className="w-3 h-3" />
                            Recorrente Mensal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Vencimento: {formatDate(item.dueDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-black text-base text-foreground block">{formatCurrency(item.amount)}</span>
                      <span
                        className={`text-xs font-bold ${
                          isPaid ? "text-emerald-400" : isOverdue ? "text-rose-400" : "text-amber-400"
                        }`}
                      >
                        {isPaid ? "Pago" : isOverdue ? "Atrasado" : "Pendente"}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Excluir conta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Bill Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-4 shadow-2xl">
            <h2 className="text-xl font-black text-foreground">Nova Conta a Pagar</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Descrição da Conta *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Fatura Cartão de Crédito ou Internet"
                  className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Favorecido / Provedor (Opcional)</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Ex: Provedor Fibra, Banco Inter"
                  className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded-md border text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Conta recorrente todo mês</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !amount || !dueDate}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-md shadow-primary/25 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
