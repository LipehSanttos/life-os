"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { TaskModal } from "@/components/tasks/TaskModal";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { TaskData } from "@/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (
        e.key.toLowerCase() === "n" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setTaskToEdit(null);
        setTaskModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (pathname === "/login") {
    return <main className="h-screen w-screen overflow-y-auto bg-background">{children}</main>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          onOpenTaskModal={() => {
            setTaskToEdit(null);
            setTaskModalOpen(true);
          }}
        />
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-64 h-full bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              onOpenTaskModal={() => {
                setTaskToEdit(null);
                setTaskModalOpen(true);
                setMobileMenuOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenTaskModal={() => {
            setTaskToEdit(null);
            setTaskModalOpen(true);
          }}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </div>

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onTaskSaved={() => window.dispatchEvent(new CustomEvent("refresh-data"))}
        taskToEdit={taskToEdit}
      />

      <GlobalSearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </div>
  );
}
