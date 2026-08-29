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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-card text-card-foreground border rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{courseToEdit ? "Editar Curso" : "Novo Curso"}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Nome do Curso *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm outline-none"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Módulo Atual</label>
              <input
                type="number"
                min={0}
                max={totalModules}
                value={currentModule}
                onChange={(e) => setCurrentModule(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Total Módulos</label>
              <input
                type="number"
                min={1}
                value={totalModules}
                onChange={(e) => setTotalModules(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-xs outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md">
              Salvar Curso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
