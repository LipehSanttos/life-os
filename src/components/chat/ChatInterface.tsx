"use client";
import React, { useState, useEffect, useRef } from "react";
import { Bot, User, Send, Mic, MicOff, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { ActionConfirmationCard } from "./ActionConfirmationCard";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pendingAction?: any;
  createdAt: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "O que tenho para hoje?",
    "Quais tarefas estão atrasadas?",
    "Adicionar tarefa: Entregar relatório amanhã às 18h",
    "Registrar conta: Internet R$ 120 dia 10",
    "Resumo da minha semana",
  ];

  const loadInitialSession = async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const sessions = await res.json();
        if (sessions && sessions.length > 0) {
          const current = sessions[0];
          setSessionId(current.id);
          const msgsRes = await fetch(`/api/chat?sessionId=${current.id}`);
          if (msgsRes.ok) setMessages(await msgsRes.json());
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInitialSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const tempId = String(Date.now());
    const newMsg: ChatMessage = {
      id: tempId,
      role: "user",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          sessionId,
        }),
      });

      if (!res.ok) throw new Error("Erro na resposta do assistente.");

      const data = await res.json();
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages((prev) => [...prev, data.message]);
    } catch (err: any) {
      toast.error(err.message || "Falha ao conversar com a IA.");
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
      toast.info("Ouvindo... Fale sua mensagem.");

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        toast.error("Erro ao capturar áudio.");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] rounded-3xl border border-border/70 bg-card/85 backdrop-blur-xl shadow-lg overflow-hidden">
      {/* Chat Messages Flow */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={cn("flex gap-3 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs",
                  isUser
                    ? "bg-primary text-primary-foreground font-bold text-xs"
                    : "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-indigo-500/20 shadow-md"
                )}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div className="space-y-3 flex-1 min-w-0">
                <div
                  className={cn(
                    "p-4 sm:p-5 rounded-3xl shadow-xs transition-all",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-muted/60 text-foreground border border-border/60 rounded-tl-xs"
                  )}
                >
                  <MarkdownRenderer content={msg.content} isUser={isUser} />
                </div>

                {/* Pending AI Action Card */}
                {msg.pendingAction && (
                  <ActionConfirmationCard
                    messageId={msg.id}
                    action={msg.pendingAction}
                    onActionHandled={() => {
                      loadInitialSession();
                      window.dispatchEvent(new CustomEvent("refresh-data"));
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-xl mr-auto animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 sm:p-5 rounded-3xl bg-muted/60 text-muted-foreground text-sm font-medium border border-border/60">
              Assistente Life OS processando sua mensagem...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-4 py-2 border-t border-border/40 bg-card/50 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-muted/70 hover:bg-primary hover:text-primary-foreground border border-border/60 transition-all flex-shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 border-t border-border/40 bg-card">
        <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-4 py-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Converse naturalmente com a IA do Life OS..."
            disabled={loading}
            className="flex-1 py-2 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 outline-none font-semibold"
          />

          <button
            type="button"
            onClick={handleVoice}
            className={cn(
              "p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors",
              isRecording && "bg-rose-500 text-white animate-pulse"
            )}
            title="Gravar por voz"
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 shadow-xs"
            title="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
