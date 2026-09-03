"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CheckSquare, FolderKanban, GraduationCap, BookOpen, DollarSign, ArrowRight } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>({ tasks: [], projects: [], courses: [], books: [], finances: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQuery("");
      setResults({ tasks: [], projects: [], courses: [], books: [], finances: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ tasks: [], projects: [], courses: [], books: [], finances: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } catch (e) {} finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-card/95 text-card-foreground border border-border/30 rounded-xl glow-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-border/30 gap-3 bg-muted/20">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite para buscar em tarefas, projetos, cursos, livros ou contas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground text-foreground input-glow"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd onClick={onClose} className="cursor-pointer text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
            ESC
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && <div className="py-6 text-center text-xs text-muted-foreground">Buscando informações...</div>}

          {results.tasks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                <CheckSquare className="w-3.5 h-3.5" /> Tarefas ({results.tasks.length})
              </div>
              <div className="space-y-1">
                {results.tasks.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => navigateTo(`/today?highlight=${task.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors group"
                  >
                    <span className="text-xs font-medium text-foreground">{task.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.projects.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                <FolderKanban className="w-3.5 h-3.5" /> Projetos ({results.projects.length})
              </div>
              <div className="space-y-1">
                {results.projects.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => navigateTo("/projects")}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <span className="text-xs font-medium text-foreground">{p.name}</span>
                    <span className="text-[10px] text-primary">{p.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.finances.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                <DollarSign className="w-3.5 h-3.5" /> Finanças ({results.finances.length})
              </div>
              <div className="space-y-1">
                {results.finances.map((f: any) => (
                  <div
                    key={f.id}
                    onClick={() => navigateTo("/finance")}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <span className="text-xs font-medium text-foreground">{f.title}</span>
                    <span className="text-[10px] text-emerald-500 font-semibold">{formatCurrency(f.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
