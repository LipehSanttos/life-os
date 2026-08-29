"use client";
import React, { useState } from "react";
import { Plus, Mic, MicOff, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickAddTaskProps {
  onTaskCreated?: () => void;
  placeholder?: string;
  defaultCategoryId?: string;
}

export function QuickAddTask({
  onTaskCreated,
  placeholder = "Adicionar tarefa rápida... (pressione Enter para salvar)",
  defaultCategoryId,
}: QuickAddTaskProps) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          categoryId: defaultCategoryId || null,
          priority: "MEDIUM",
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar tarefa rápida.");

      setTitle("");
      toast.success("Tarefa adicionada!");
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar tarefa.");
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Reconhecimento de voz não suportado neste navegador.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;

    if (!isRecording) {
      recognition.start();
      setIsRecording(true);
      toast.info("Ouvindo... Fale sua tarefa.");

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTitle(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        toast.error("Não foi possível capturar o áudio.");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
    }
  };

  return (
    <form onSubmit={handleCreate} className="relative flex items-center w-full">
      <div className="relative flex items-center w-full rounded-2xl border border-border/70 bg-card/90 backdrop-blur-md shadow-xs focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
        <div className="pl-4 text-primary">
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          className="flex-1 py-3.5 px-3.5 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 outline-none font-semibold"
        />

        <div className="flex items-center gap-1 pr-2.5">
          <button
            type="button"
            onClick={handleVoice}
            className={cn(
              "p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              isRecording && "bg-rose-500 text-white animate-pulse"
            )}
            title="Ditar tarefa por voz"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {title.trim() && (
            <button
              type="submit"
              disabled={loading}
              className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
              title="Salvar tarefa"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
