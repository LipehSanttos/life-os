"use client";
import React, { useState, useEffect } from "react";
import { Inbox } from "lucide-react";
import { TaskItem } from "@/components/tasks/TaskItem";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TaskData } from "@/types";

export default function InboxPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskData | null>(null);

  const loadInbox = async () => {
    try {
      const res = await fetch("/api/tasks?isInbox=true&status=PENDING");
      if (res.ok) setTasks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInbox();
    window.addEventListener("refresh-data", loadInbox);
    return () => window.removeEventListener("refresh-data", loadInbox);
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
          <Inbox className="w-5 h-5 text-blue-500" />
          <span>Caixa de Entrada</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
          Inbox
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
          Capture ideias e pendências instantaneamente para organizar e categorizar depois.
        </p>
      </div>

      {/* Quick Input Bar */}
      <div>
        <QuickAddTask
          onTaskCreated={loadInbox}
          placeholder="O que veio à mente agora? (ex: Comprar adaptador usb-c)..."
        />
      </div>

      {/* Tasks List */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <span className="font-bold text-base text-foreground">Itens não processados ({tasks.length})</span>
        </div>

        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground font-medium">
              🎉 Sua Inbox está totalmente limpa e vazia!
            </div>
          ) : (
            tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={loadInbox}
                onEdit={(t) => {
                  setTaskToEdit(t);
                  setTaskModalOpen(true);
                }}
                onDelete={async (id) => {
                  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
                  loadInbox();
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
        onTaskSaved={loadInbox}
        taskToEdit={taskToEdit}
      />
    </div>
  );
}
