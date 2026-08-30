"use client";
import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  Folder,
  GraduationCap,
  BookOpen,
  DollarSign,
  MoreVertical,
  CheckSquare,
  Edit2,
  Trash2,
  CalendarPlus,
  Play,
  Pause,
} from "lucide-react";
import { TaskData } from "@/types";
import { cn, formatDate, getPriorityColor, getPriorityLabel, formatCurrency } from "@/lib/utils";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendar";
import confetti from "canvas-confetti";
import { toast } from "sonner";

interface TaskItemProps {
  task: TaskData;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onEdit?: (task: TaskData) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskItem({ task, onStatusChange, onEdit, onDelete }: TaskItemProps) {
  const [completed, setCompleted] = useState(task.status === "COMPLETED");
  const [isHovered, setIsHovered] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Sincroniza estado visual quando as propriedades da tarefa mudam
  useEffect(() => {
    setCompleted(task.status === "COMPLETED");
  }, [task.status]);

  const handleToggle = async () => {
    if (updating) return;

    const newStatus = completed ? "PENDING" : "COMPLETED";
    const previousState = completed;

    // Atualização otimista imediata na UI
    setCompleted(!previousState);
    setUpdating(true);

    if (newStatus === "COMPLETED") {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
      });
      toast.success("Tarefa concluída!");
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar status da tarefa.");
      }

      // Notifica o restante do sistema para atualizar métricas e listagens
      window.dispatchEvent(new CustomEvent("refresh-data"));

      if (onStatusChange) {
        onStatusChange(task.id, newStatus);
      }
    } catch (error) {
      console.error("Falha ao persistir status da tarefa:", error);
      setCompleted(previousState);
      toast.error("Não foi possível atualizar o status no banco de dados.");
    } finally {
      setUpdating(false);
    }
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED";

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200",
        completed
          ? "bg-muted/30 border-border/40 opacity-70"
          : isOverdue
          ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/10"
          : "bg-card/90 border-border/70 hover:border-primary/40 hover:bg-card hover:shadow-sm"
      )}
    >
      {/* Left: Checkbox + Content */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <button
          onClick={handleToggle}
          disabled={updating}
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none disabled:opacity-50"
          title={completed ? "Marcar como pendente" : "Concluir tarefa"}
        >
          {completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:scale-110 transition-transform" />
          )}
        </button>

        <div className="flex flex-col min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm sm:text-base font-bold truncate leading-tight",
                completed ? "line-through text-muted-foreground font-medium" : "text-foreground"
              )}
            >
              {task.title}
            </span>

            {/* Priority Badge */}
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-bold rounded-md border",
                getPriorityColor(task.priority)
              )}
            >
              {getPriorityLabel(task.priority)}
            </span>

            {/* Category Tag */}
            {task.category && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md border"
                style={{
                  backgroundColor: `${task.category.color}15`,
                  color: task.category.color,
                  borderColor: `${task.category.color}30`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: task.category.color }}
                />
                <span>{task.category.name}</span>
              </span>
            )}
          </div>

          {/* Metadata details */}
          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-medium",
                  isOverdue ? "text-rose-500 font-bold" : ""
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(task.dueDate)}</span>
                {task.dueTime && <span>às {task.dueTime}</span>}
              </span>
            )}

            {task.project && (
              <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                <Folder className="w-3.5 h-3.5 text-blue-400" />
                <span>{task.project.name}</span>
              </span>
            )}

            {totalSubtasks > 0 && (
              <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold">
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
                <span>{completedSubtasks}/{totalSubtasks}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions on Hover */}
      <div className="flex items-center gap-1 ml-3 flex-shrink-0">
        <button
          onClick={() => {
            const gCalUrl = generateGoogleCalendarUrl({
              title: task.title,
              description: task.description,
              dueDate: task.dueDate,
              dueTime: task.dueTime,
            });
            window.open(gCalUrl, "_blank", "noopener,noreferrer");
            toast.success("Abrindo Google Agenda...");
          }}
          className="p-2 rounded-xl text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
          title="Adicionar ao Google Agenda"
        >
          <CalendarPlus className="w-4 h-4" />
        </button>

        {onEdit && (
          <button
            onClick={() => onEdit(task)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            title="Editar tarefa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Excluir tarefa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
