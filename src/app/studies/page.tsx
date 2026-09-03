"use client";
import React, { useState, useEffect } from "react";
import { GraduationCap, Plus, BookOpenCheck, Laptop, CheckCircle2, ChevronRight } from "lucide-react";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskModal } from "@/components/tasks/TaskModal";
import { CourseData, TaskData } from "@/types";
import { toast } from "sonner";

export default function StudiesPage() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [academicTasks, setAcademicTasks] = useState<TaskData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [totalModules, setTotalModules] = useState(10);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/studies");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
        setAcademicTasks(data.academicTasks || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          institution: institution.trim() || null,
          totalModules: Number(totalModules) || 1,
        }),
      });

      if (!res.ok) throw new Error("Erro ao cadastrar curso.");

      toast.success("Curso cadastrado com sucesso!");
      setName("");
      setInstitution("");
      setTotalModules(10);
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao cadastrar curso.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceModule = async (course: CourseData) => {
    if (course.currentModule >= course.totalModules) return;
    const nextMod = course.currentModule + 1;
    const nextProgress = Math.round((nextMod / course.totalModules) * 100);

    try {
      await fetch(`/api/studies/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentModule: nextMod,
          progress: nextProgress,
          status: nextProgress === 100 ? "COMPLETED" : "IN_PROGRESS",
        }),
      });

      toast.success(`Módulo ${nextMod} concluído!`);
      loadData();
    } catch (e) {
      toast.error("Erro ao atualizar módulo.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <span>Educação & Formação</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            <span className="text-gradient">Estudos & Cursos</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Monitore seu avanço em cursos, módulos e entregas da faculdade.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-primary hover:bg-primary/90 glow-border-hover text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Curso</span>
        </button>
      </div>

      {/* Courses Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Cursos em Andamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-6 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border-hover flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                    {course.progress}%
                  </span>
                </div>
                <h3 className="font-bold text-base text-foreground leading-snug">{course.name}</h3>
                {course.institution && (
                  <p className="text-xs text-muted-foreground font-medium">{course.institution}</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Módulo {course.currentModule} de {course.totalModules}</span>
                  <span>{course.progress}% Concluído</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-border/70 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>

                <button
                  onClick={() => handleAdvanceModule(course)}
                  disabled={course.currentModule >= course.totalModules}
                  className="w-full py-2.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 text-xs font-bold transition-all disabled:opacity-40"
                >
                  {course.currentModule >= course.totalModules ? "Curso Concluído 🎉" : "+ Concluir 1 Módulo"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Academic Deliverables & Tasks */}
      <div className="p-6 sm:p-8 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border-hover space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40 font-bold text-base text-foreground">
          <BookOpenCheck className="w-5 h-5 text-pink-500" />
          <span>Trabalhos & Entregas da Faculdade ({academicTasks.length})</span>
        </div>

        <div className="space-y-2">
          {academicTasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground font-medium">
              🎉 Nenhum trabalho acadêmico pendente!
            </div>
          ) : (
            academicTasks.map((t) => (
              <TaskItem key={t.id} task={t} onStatusChange={loadData} />
            ))
          )}
        </div>
      </div>

      {/* New Course Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-border/30 bg-card/95 backdrop-blur-2xl p-6 sm:p-8 space-y-4 glow-border shadow-2xl">
            <h2 className="text-xl font-black text-foreground">Cadastrar Novo Curso</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Nome do Curso *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Arquitetura de Software em Microsserviços"
                  className="w-full px-4 py-3 rounded-lg border border-border/40 bg-background/80 text-foreground text-sm outline-none input-glow font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Instituição / Plataforma</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ex: Alura, Udemy, FIAP"
                  className="w-full px-4 py-3 rounded-lg border border-border/40 bg-background/80 text-foreground text-sm outline-none input-glow font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Total de Módulos</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={totalModules}
                  onChange={(e) => setTotalModules(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border border-border/40 bg-background/80 text-foreground text-sm outline-none input-glow font-semibold"
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
                  {loading ? "Salvando..." : "Cadastrar Curso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
