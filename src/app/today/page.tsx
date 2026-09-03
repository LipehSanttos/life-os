"use client";
import React, { useState, useEffect } from "react";
import { Sun, AlertCircle, Calendar } from "lucide-react";
import { TaskItem } from "@/components/tasks/TaskItem";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TaskData, CategoryData } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TodayPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskData | null>(null);

  const loadData = async () => {
    try {
      const [todayRes, overdueRes, catsRes] = await Promise.all([
        fetch("/api/tasks?timeFrame=today"),
        fetch("/api/tasks?timeFrame=overdue"),
        fetch("/api/categories"),
      ]);
      if (todayRes.ok) setTasks(await todayRes.json());
      if (overdueRes.ok) setOverdueTasks(await overdueRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("refresh-data", loadData);
    return () => window.removeEventListener("refresh-data", loadData);
  }, []);

  const filteredTasks =
    selectedCategory === "all"
      ? tasks
      : tasks.filter((t) => t.categoryId === selectedCategory);

  const dateStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border">
        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2 capitalize">
          <Sun className="w-5 h-5 text-amber-500" />
          <span>{dateStr}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
          <span className="text-gradient">Minhas Tarefas de Hoje</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
          Concentre-se nas prioridades do dia e mantenha seu ritmo produtivo.
        </p>
      </div>

      {/* Quick Add Bar */}
      <div>
        <QuickAddTask
          onTaskCreated={loadData}
          placeholder="Adicionar tarefa para hoje..."
          defaultCategoryId={selectedCategory !== "all" ? selectedCategory : undefined}
        />
      </div>

      {/* Categories Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-card/70 hover:bg-muted text-muted-foreground border border-border/60"
          }`}
        >
          Todas ({tasks.length})
        </button>
        {categories.map((cat) => {
          const count = tasks.filter((t) => t.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-card/70 hover:bg-muted text-muted-foreground border border-border/60"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              <span>{cat.name}</span>
              {count > 0 && <span className="text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Overdue Section */}
      {overdueTasks.length > 0 && (
        <div className="p-6 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-xl glow-border-hover space-y-4">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-base">
            <AlertCircle className="w-5 h-5" />
            <span>Atrasadas ({overdueTasks.length})</span>
          </div>

          <div className="space-y-2">
            {overdueTasks.map((task) => (
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
            ))}
          </div>
        </div>
      )}

      {/* Main Today Tasks Panel */}
      <div className="p-6 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border-hover space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2 font-bold text-base text-foreground">
            <Calendar className="w-5 h-5 text-primary" />
            <span>Programadas para Hoje ({filteredTasks.length})</span>
          </div>
        </div>

        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground font-medium">
              🎉 Nenhuma tarefa pendente para hoje nesta categoria!
            </div>
          ) : (
            filteredTasks.map((task) => (
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
