"use client";
import React, { useState, useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { BookData } from "@/types";

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  bookToEdit?: BookData | null;
}

export function BookModal({ isOpen, onClose, onSaved, bookToEdit }: BookModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState(288);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (bookToEdit) {
        setTitle(bookToEdit.title);
        setAuthor(bookToEdit.author || "");
        setTotalPages(bookToEdit.totalPages || 288);
        setCurrentPage(bookToEdit.currentPage || 0);
      } else {
        setTitle("");
        setAuthor("");
        setTotalPages(288);
        setCurrentPage(0);
      }
    }
  }, [isOpen, bookToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Título obrigatório.");

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        author: author.trim() || null,
        totalPages: parseInt(String(totalPages)) || 100,
        currentPage: parseInt(String(currentPage)) || 0,
      };

      const url = bookToEdit ? `/api/reading/${bookToEdit.id}` : "/api/reading";
      const method = bookToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar.");
      toast.success(bookToEdit ? "Livro atualizado!" : "Livro adicionado!");
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
      <div className="relative w-full max-w-lg bg-card text-card-foreground border rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-semibold">{bookToEdit ? "Editar Livro" : "Novo Livro"}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Título do Livro *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm outline-none"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Página Atual</label>
              <input
                type="number"
                min={0}
                max={totalPages}
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Total Páginas</label>
              <input
                type="number"
                min={1}
                value={totalPages}
                onChange={(e) => setTotalPages(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-xs outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md">
              Salvar Livro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
