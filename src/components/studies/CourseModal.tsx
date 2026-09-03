"use client";
import React, { useState, useEffect } from "react";
import { X, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { CourseData } from "@/types";

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseSaved: () => void;
  courseToEdit?: CourseData | null;
}

export function CourseModal({ isOpen, onClose, onCourseSaved, courseToEdit }: CourseModalProps) {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [totalModules, setTotalModules] = useState(10);
  const [currentModule, setCurrentModule] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (courseToEdit) {
        setName(courseToEdit.name);
        setInstitution(courseToEdit.institution || "");
        setTotalModules(courseToEdit.totalModules || 10);
        setCurrentModule(courseToEdit.currentModule || 0);
        setDueDate(courseToEdit.dueDate ? courseToEdit.dueDate.split("T")[0] : "");
      } else {
        setName("");
        setInstitution("");
        setTotalModules(10);
        setCurrentModule(0);
        setDueDate("");
      }
    }
  }, [isOpen, courseToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome obrigatório.");

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        institution: institution.trim() || null,
        totalModules: parseInt(String(totalModules)) || 1,
        currentModule: parseInt(String(currentModule)) || 0,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };

      const url = courseToEdit ? `/api/studies/${courseToEdit.id}` : "/api/studies";
      const method = courseToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar.");
      toast.success(courseToEdit ? "Curso atualizado!" : "Curso criado!");
      onCourseSaved();
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
            <GraduationCap className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{courseToEdit ? "Editar Curso" : "Novo Curso"}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Nome do Curso *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Módulo Atual</label>
              <input
                type="number"
                min={0}
                max={totalModules}
                value={currentModule}
                onChange={(e) => setCurrentModule(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Total Módulos</label>
              <input
                type="number"
                min={1}
                value={totalModules}
                onChange={(e) => setTotalModules(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-xs outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/30">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold glow-border-hover shadow-lg shadow-primary/25 active:scale-[0.98] transition-all">
              Salvar Curso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
