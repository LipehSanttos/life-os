"use client";
import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TaskData, FinancialReminderData } from "@/types";
import { TaskModal } from "@/components/tasks/TaskModal";
import { cn, formatCurrency } from "@/lib/utils";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [bills, setBills] = useState<FinancialReminderData[]>([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskData | null>(null);

  const loadData = async () => {
    try {
      const [tasksRes, finRes] = await Promise.all([fetch("/api/tasks"), fetch("/api/finance")]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (finRes.ok) {
        const d = await finRes.json();
        setBills(d.reminders || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("refresh-data", loadData);
    return () => window.removeEventListener("refresh-data", loadData);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const daysInMonthView = eachDayOfInterval({ start: startDate, end: endDate });

  const getItemsForDay = (date: Date) => {
    const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));
    const dayBills = bills.filter((b) => isSameDay(new Date(b.dueDate), date));
    return { dayTasks, dayBills };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            <span>Calendário Mensal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground capitalize">
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-muted/60 border border-border/60 p-1.5 rounded-2xl">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 rounded-xl hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl hover:bg-card text-foreground transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 rounded-xl hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40 text-center py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
        </div>
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/50">
          {daysInMonthView.map((day, idx) => {
            const isCurrMonth = isSameMonth(day, monthStart);
            const isCurrentDay = isToday(day);
            const { dayTasks, dayBills } = getItemsForDay(day);

            return (
              <div
                key={idx}
                onClick={() => {
                  setTaskToEdit(null);
                  setTaskModalOpen(true);
                }}
                className={cn(
                  "min-h-[110px] p-2 sm:p-2.5 flex flex-col justify-between transition-colors cursor-pointer hover:bg-muted/40",
                  !isCurrMonth && "opacity-35 bg-muted/20",
                  isCurrentDay && "bg-primary/5 ring-1 ring-inset ring-primary/30"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-xs font-black",
                      isCurrentDay
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground font-bold"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                <div className="space-y-1 overflow-hidden flex-1">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className="truncate px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                    >
                      {t.title}
                    </div>
                  ))}
                  {dayBills.slice(0, 1).map((b) => (
                    <div
                      key={b.id}
                      className="truncate px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-500/10 text-teal-500 border border-teal-500/20"
                    >
                      💰 {b.title}
                    </div>
                  ))}
                  {dayTasks.length + dayBills.length > 3 && (
                    <span className="text-[10px] font-bold text-muted-foreground pl-1">
                      +{dayTasks.length + dayBills.length - 2} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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
