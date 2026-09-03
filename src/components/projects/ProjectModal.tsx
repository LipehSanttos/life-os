"use client";
import React, { useState, useEffect } from "react";
import { X, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { CategoryData, ProjectData } from "@/types";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSaved: () => void;
  projectToEdit?: ProjectData | null;
}

export function ProjectModal({ isOpen, onClose, onProjectSaved, projectToEdit }: ProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/categories").then((r) => r.json()).then((data) => setCategories(data || []));
      if (projectToEdit) {
        setName(projectToEdit.name);
        setDescription(projectToEdit.description || "");
        setCategoryId(projectToEdit.categoryId || "");
        setPriority(projectToEdit.priority || "MEDIUM");
        setDueDate(projectToEdit.dueDate ? projectToEdit.dueDate.split("T")[0] : "");
      } else {
        setName("");
        setDescription("");
        setCategoryId("");
        setPriority("MEDIUM");
        setDueDate("");
      }
    }
  }, [isOpen, projectToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("O nome é obrigatório.");

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        categoryId: categoryId || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };

      const url = projectToEdit ? `/api/projects/${projectToEdit.id}` : "/api/projects";
      const method = projectToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar.");
      toast.success(projectToEdit ? "Projeto atualizado!" : "Projeto criado!");
      onProjectSaved();
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
            <FolderKanban className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{projectToEdit ? "Editar Projeto" : "Novo Projeto"}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Nome do Projeto *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Descrição</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-xs outline-none resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/30">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold glow-border-hover shadow-lg shadow-primary/25 active:scale-[0.98] transition-all">
              {loading ? "Salvando..." : "Salvar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
