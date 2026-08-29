"use client";
import React, { useState, useEffect } from "react";
import { FolderKanban, Plus, Calendar, CheckSquare, Trash2, Edit2, Sparkles, Folder } from "lucide-react";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskModal } from "@/components/tasks/TaskModal";
import { ProjectData, TaskData, CategoryData } from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskData | null>(null);

  // New project form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [categoryId, setCategoryId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const [projRes, catRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/categories"),
      ]);
      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0]);
        } else if (selectedProject) {
          const updated = data.find((p: ProjectData) => p.id === selectedProject.id);
          if (updated) setSelectedProject(updated);
        }
      }
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          priority,
          categoryId: categoryId || null,
          dueDate: dueDate ? new Date(`${dueDate}T12:00:00Z`).toISOString() : null,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar projeto.");

      toast.success("Projeto criado com sucesso!");
      setName("");
      setDescription("");
      setCategoryId("");
      setDueDate("");
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao criar projeto.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este projeto e desvincular suas tarefas?")) return;
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      toast.success("Projeto excluído.");
      setSelectedProject(null);
      loadData();
    } catch (e) {
      toast.error("Erro ao excluir projeto.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
            <FolderKanban className="w-5 h-5 text-emerald-500" />
            <span>Gestão Estratégica</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Projetos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Organize suas iniciativas em tarefas e acompanhe a evolução automática do progresso.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md shadow-primary/25 active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Projeto</span>
        </button>
      </div>

      {/* Dual Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Projects List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">
            Projetos Ativos ({projects.length})
          </h3>

          {projects.length === 0 ? (
            <div className="p-8 rounded-3xl border border-border/70 bg-card/80 text-center text-sm text-muted-foreground">
              Nenhum projeto cadastrado. Clique em <strong>Novo Projeto</strong> para começar.
            </div>
          ) : (
            projects.map((proj) => {
              const isSelected = selectedProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-sm"
                      : "bg-card/80 border-border/70 hover:border-primary/40 hover:bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-foreground truncate">{proj.name}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-foreground">
                      {proj.progress}%
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-border/60 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>{proj.tasks?.length || 0} tarefas</span>
                    {proj.dueDate && <span>Entrega: {formatDate(proj.dueDate)}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Project Detail & Tasks */}
        <div className="lg:col-span-2">
          {selectedProject ? (
            <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground">{selectedProject.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                      {selectedProject.status}
                    </span>
                  </div>
                  {selectedProject.description && (
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      {selectedProject.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteProject(selectedProject.id)}
                  className="p-2.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Excluir projeto"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Summary Card */}
              <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Progresso Geral</span>
                  <span className="text-sm font-black text-emerald-400">{selectedProject.progress}% Concluído</span>
                </div>
                <div className="w-full h-3 rounded-full bg-border/80 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${selectedProject.progress}%` }}
                  />
                </div>
              </div>

              {/* Tasks of this Project */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-foreground">Tarefas do Projeto</h3>
                  <button
                    onClick={() => {
                      setTaskToEdit(null);
                      setTaskModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 text-xs font-bold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Tarefa</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(!selectedProject.tasks || selectedProject.tasks.length === 0) ? (
                    <div className="py-12 text-center text-sm text-muted-foreground font-medium">
                      Nenhuma tarefa vinculada a este projeto ainda.
                    </div>
                  ) : (
                    selectedProject.tasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onStatusChange={loadData}
                        onEdit={(t) => {
                          setTaskToEdit(t);
                          setTaskModalOpen(true);
                        }}
                        onDelete={async (id) => {
                          await fetch(`/api/tasks/${id}`, { method: "DELETE" });
                          loadData();
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl border border-border/70 bg-card/80 text-center text-sm sm:text-base text-muted-foreground font-medium">
              Selecione um projeto ao lado para visualizar suas tarefas e progresso.
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-4 shadow-2xl">
            <h2 className="text-xl font-black text-foreground">Novo Projeto</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Nome do Projeto *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Redesign do Website"
                  className="w-full px-4 py-3 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Descrição / Objetivo</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve resumo sobre o objetivo do projeto..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">Data de Conclusão</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm shadow-md shadow-primary/25"
                >
                  {loading ? "Criando..." : "Criar Projeto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onTaskSaved={loadData}
        taskToEdit={taskToEdit}
      />
    </div>
  );
}
