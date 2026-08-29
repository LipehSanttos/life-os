"use client";
import React, { useState, useEffect } from "react";
import { X, Tags } from "lucide-react";
import { toast } from "sonner";
import { CategoryData } from "@/types";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categoryToEdit?: CategoryData | null;
}

export function CategoryModal({ isOpen, onClose, onSaved, categoryToEdit }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [loading, setLoading] = useState(false);

  const predefinedColors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
    "#f59e0b", "#10b981", "#14b8a6", "#0ea5e9", "#3b82f6",
  ];

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setColor(categoryToEdit.color || "#6366f1");
      } else {
        setName("");
        setColor("#6366f1");
      }
    }
  }, [isOpen, categoryToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome obrigatório.");

    setLoading(true);
    try {
      const payload = { name: name.trim(), color };
      const url = categoryToEdit ? `/api/categories/${categoryToEdit.id}` : "/api/categories";
      const method = categoryToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar.");
      toast.success(categoryToEdit ? "Categoria atualizada!" : "Categoria criada!");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-card text-card-foreground border rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold">{categoryToEdit ? "Editar Categoria" : "Nova Categoria"}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Nome da Categoria *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2">Cor</label>
            <div className="flex items-center gap-2 flex-wrap">
              {predefinedColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-foreground" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md">
              Salvar Categoria
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
