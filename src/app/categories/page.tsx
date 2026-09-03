"use client";
import React, { useState, useEffect } from "react";
import { Tags, Plus, Trash2, Edit2, Folder } from "lucide-react";
import { CategoryData } from "@/types";
import { toast } from "sonner";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });

      if (!res.ok) throw new Error("Erro ao criar categoria.");

      toast.success("Categoria criada com sucesso!");
      setName("");
      setColor("#6366f1");
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao criar categoria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
            <Tags className="w-5 h-5 text-indigo-400" />
            <span>Estruturação</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            <span className="text-gradient">Categorias de Vida</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Agrupe tarefas, compromissos e metas por áreas temáticas personalizadas.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-primary hover:bg-primary/90 glow-border-hover text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-5 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border-hover flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs group-hover:scale-125 transition-transform"
                style={{ backgroundColor: cat.color }}
              />
              <div>
                <span className="font-bold text-base text-foreground block">{cat.name}</span>
                <span className="text-xs text-muted-foreground font-medium">
                  {cat._count?.tasks || 0} tarefas vinculadas
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border/30 bg-card/95 backdrop-blur-2xl p-6 sm:p-8 space-y-4 glow-border shadow-2xl">
            <h2 className="text-xl font-black text-foreground">Nova Categoria</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Nome da Categoria *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Saúde & Bem-estar"
                  className="w-full px-4 py-3 rounded-lg border border-border/40 bg-background/80 text-foreground text-sm outline-none input-glow font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Cor Temática</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-12 rounded-lg border border-border/40 bg-background cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 glow-border-hover text-primary-foreground font-black text-sm shadow-lg shadow-primary/25 transition-all"
                >
                  {loading ? "Criando..." : "Criar Categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
