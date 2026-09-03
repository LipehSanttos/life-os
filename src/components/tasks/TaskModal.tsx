"use client";
import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Tag, Flag, Folder, GraduationCap, Check, Plus, Trash2 } from "lucide-react";
import { TaskData, CategoryData, ProjectData, CourseData } from "@/types";
import { toast } from "sonner";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskSaved?: () => void;
  taskToEdit?: TaskData | null;
  defaultCategoryId?: string;
}

export function TaskModal({
  isOpen,
  onClose,
  onTaskSaved,
  taskToEdit,
  defaultCategoryId,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("PENDING");
  const [categoryId, setCategoryId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [dueTime, setDueTime] = useState<string>("");
  const [subtasks, setSubtasks] = useState<{ id?: string; title: string; isCompleted: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/categories").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/studies").then((r) => r.json()),
      ]).then(([cats, projs, studies]) => {
        setCategories(cats || []);
        setProjects(projs || []);
        setCourses(Array.isArray(studies) ? studies : (studies?.courses || []));
      });

      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || "");
        setPriority(taskToEdit.priority);
        setStatus(taskToEdit.status);
        setCategoryId(taskToEdit.categoryId || "");
        setProjectId(taskToEdit.projectId || "");
        setCourseId(taskToEdit.courseId || "");
        setDueDate(taskToEdit.dueDate ? new Date(taskToEdit.dueDate).toISOString().split("T")[0] : "");
        setDueTime(taskToEdit.dueTime || "");
        setSubtasks(taskToEdit.subtasks || []);
      } else {
        setTitle("");
        setDescription("");
        setPriority("MEDIUM");
        setStatus("PENDING");
        setCategoryId(defaultCategoryId || "");
        setProjectId("");
        setCourseId("");
        setDueDate(new Date().toISOString().split("T")[0]);
        setDueTime("");
        setSubtasks([]);
      }
    }
  }, [isOpen, taskToEdit, defaultCategoryId]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), isCompleted: false }]);
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status,
        categoryId: categoryId || null,
        projectId: projectId || null,
        courseId: courseId || null,
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00Z`).toISOString() : null,
        dueTime: dueTime || null,
        subtasks,
      };

      const url = taskToEdit ? `/api/tasks/${taskToEdit.id}` : "/api/tasks";
      const method = taskToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar tarefa.");

      toast.success(taskToEdit ? "Tarefa atualizada!" : "Tarefa criada com sucesso!");
      if (onTaskSaved) onTaskSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar tarefa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-xl border border-border/30 bg-card/95 backdrop-blur-2xl glow-border shadow-2xl text-card-foreground overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <h2 className="text-lg sm:text-xl font-black text-foreground">
            {taskToEdit ? "Editar Tarefa" : "Nova Tarefa"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Título da Tarefa *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Entregar relatório trimestral"
              className="w-full px-4 py-3 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm sm:text-base outline-none font-semibold"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Descrição / Detalhes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione notas, links ou detalhes adicionais..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none font-medium resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-primary" />
                <span>Categoria</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none font-semibold"
              >
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-amber-500" />
                <span>Prioridade</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none font-semibold"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>Data de Vencimento</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none font-medium"
              >
              </input>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Horário (Opcional)</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-emerald-500" />
                <span>Vincular ao Projeto</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none font-medium"
              >
                <option value="">Nenhum projeto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>Vincular ao Curso / Estudo</span>
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none font-medium"
              >
                <option value="">Nenhum curso</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="pt-2">
            <label className="block text-sm font-bold text-foreground mb-1.5">Subtarefas / Checklist</label>
            <div className="space-y-2 mb-3">
              {subtasks.map((st, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/30 text-sm"
                >
                  <span className={st.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}>
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(index)}
                    className="text-muted-foreground hover:text-rose-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Nova etapa do checklist..."
                className="flex-1 px-3.5 py-2 rounded-lg border border-border/40 bg-background/80 input-glow text-foreground text-sm outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-bold text-sm border border-border/30 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black glow-border-hover shadow-lg shadow-primary/25 active:scale-95 transition-all"
            >
              {loading ? "Salvando..." : taskToEdit ? "Atualizar Tarefa" : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
