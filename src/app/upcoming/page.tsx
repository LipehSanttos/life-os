"use client";
import React, { useState, useEffect } from "react";
import { CalendarDays, Calendar as CalendarIcon } from "lucide-react";
import { TaskItem } from "@/components/tasks/TaskItem";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TaskData } from "@/types";
import { formatDate } from "@/lib/utils";

export default function UpcomingPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [timeFrame, setTimeFrame] = useState<"upcoming3" | "upcoming7" | "upcoming30">("upcoming7");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskData | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/tasks?timeFrame=${timeFrame}`);
      if (res.ok) setTasks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFrame]);

  // Group tasks by date
  const groupedTasks: Record<string, TaskData[]> = {};
  tasks.forEach((task) => {
    const dateKey = task.dueDate ? formatDate(task.dueDate) : "Sem data definida";
    if (!groupedTasks[dateKey]) groupedTasks[dateKey] = [];
    groupedTasks[dateKey].push(task);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
            <CalendarDays className="w-5 h-5 text-blue-500" />
            <span>Planejamento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Próximos Dias
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Visualize seus compromissos futuros e antecipe prazos importantes.
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/60 border border-border/60 self-start md:self-auto">
          <button
            onClick={() => setTimeFrame("upcoming3")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              timeFrame === "upcoming3"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            3 Dias
          </button>
          <button
            onClick={() => setTimeFrame("upcoming7")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              timeFrame === "upcoming7"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setTimeFrame("upcoming30")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              timeFrame === "upcoming30"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            30 Dias
          </button>
        </div>
      </div>

      {/* Quick Add Bar */}
      <div>
        <QuickAddTask onTaskCreated={loadData} placeholder="Agendar nova tarefa futura..." />
      </div>

      {/* Grouped Tasks */}
      <div className="space-y-6">
        {Object.keys(groupedTasks).length === 0 ? (
          <div className="p-12 rounded-3xl border border-border/70 bg-card/80 text-center text-sm sm:text-base text-muted-foreground font-medium">
            🎉 Nenhuma tarefa agendada para o período selecionado.
          </div>
        ) : (
          Object.entries(groupedTasks).map(([date, dayTasks]) => (
            <div
              key={date}
              className="p-6 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 font-bold text-base text-foreground">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                <span>{date} ({dayTasks.length})</span>
              </div>

              <div className="space-y-2">
                {dayTasks.map((task) => (
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
          ))
        )}
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
