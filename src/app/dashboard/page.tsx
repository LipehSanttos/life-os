"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sun,
  CalendarDays,
  AlertCircle,
  FolderKanban,
  GraduationCap,
  DollarSign,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { DailyGreeting } from "@/components/dashboard/DailyGreeting";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskItem } from "@/components/tasks/TaskItem";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskModal } from "@/components/tasks/TaskModal";
import {
  TaskData,
  ProjectData,
  CourseData,
  BookData,
  FinancialReminderData,
} from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todayCount: 0,
    upcomingCount: 0,
    overdueCount: 0,
    activeProjectsCount: 0,
    inProgressCoursesCount: 0,
    highCount: 0,
  });

  const [todayTasks, setTodayTasks] = useState<TaskData[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskData[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [books, setBooks] = useState<BookData[]>([]);
  const [finances, setFinances] = useState<FinancialReminderData[]>([]);
  const [userName, setUserName] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskData | null>(null);

  const loadData = async () => {
    try {
      const [statsRes, todayRes, overdueRes, upcomingRes, projsRes, studiesRes, booksRes, finRes, meRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/tasks?timeFrame=today"),
        fetch("/api/tasks?timeFrame=overdue"),
        fetch("/api/tasks?timeFrame=upcoming7"),
        fetch("/api/projects"),
        fetch("/api/studies"),
        fetch("/api/reading"),
        fetch("/api/finance"),
        fetch("/api/auth/me"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (todayRes.ok) setTodayTasks(await todayRes.json());
      if (overdueRes.ok) setOverdueTasks(await overdueRes.json());
      if (upcomingRes.ok) setUpcomingTasks(await upcomingRes.json());
      if (projsRes.ok) setProjects(await projsRes.json());
      if (studiesRes.ok) {
        const studiesData = await studiesRes.json();
        setCourses(studiesData.courses || []);
      }
      if (booksRes.ok) setBooks(await booksRes.json());
      if (finRes.ok) {
        const finData = await finRes.json();
        setFinances(finData.reminders || []);
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user?.name) setUserName(meData.user.name);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hero Greeting Briefing */}
      <DailyGreeting
        userName={userName || "Eduardo Felipe"}
        todayCount={stats.todayCount}
        highCount={stats.highCount}
        overdueCount={stats.overdueCount}
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard label="Hoje" value={stats.todayCount} icon={Sun} color="#f59e0b" href="/today" />
        <StatCard label="Próximos 7 Dias" value={stats.upcomingCount} icon={CalendarDays} color="#3b82f6" href="/upcoming" />
        <StatCard
          label="Atrasadas"
          value={stats.overdueCount}
          icon={AlertCircle}
          color="#ef4444"
          href="/today"
          subtitle={stats.overdueCount > 0 ? "Atenção necessária" : "Tudo em dia"}
        />
        <StatCard label="Projetos" value={stats.activeProjectsCount} icon={FolderKanban} color="#10b981" href="/projects" />
        <StatCard label="Cursos" value={stats.inProgressCoursesCount} icon={GraduationCap} color="#8b5cf6" href="/studies" />
        <StatCard label="Contas" value={finances.length} icon={DollarSign} color="#14b8a6" href="/finance" />
      </div>

      {/* Quick Add Bar */}
      <div>
        <QuickAddTask onTaskCreated={loadData} placeholder="Nova tarefa rápida no Life OS... (digite ou use o microfone)" />
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide): Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <div className="p-6 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-xl glow-border-hover space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-base">
                  <AlertCircle className="w-5 h-5" />
                  <span>Atrasadas ({overdueTasks.length})</span>
                </div>
                <Link href="/today" className="text-xs font-semibold text-rose-400 hover:underline">
                  Ver todas
                </Link>
              </div>

              <div className="space-y-2">
                {overdueTasks.slice(0, 4).map((task) => (
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

          {/* Today Tasks */}
          <div className="p-6 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border-hover space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <Sun className="w-5 h-5 text-amber-500" />
                <span>Tarefas de Hoje ({todayTasks.length})</span>
              </div>
              <Link href="/today" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                <span>Ver tudo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {todayTasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground font-medium">
                  🎉 Nenhuma tarefa agendada para hoje.
                </div>
              ) : (
                todayTasks.map((task) => (
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

          {/* Upcoming Preview */}
          {upcomingTasks.length > 0 && (
            <div className="p-6 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border-hover space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base text-foreground">
                  <CalendarDays className="w-5 h-5 text-blue-500" />
                  <span>Próximos Dias</span>
                </div>
                <Link href="/upcoming" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  <span>Ver agenda</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2">
                {upcomingTasks.slice(0, 4).map((task) => (
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
        </div>

        {/* Right Column: Projects, Studies & Finances summary */}
        <div className="space-y-6">
          {/* Active Projects */}
          <div className="p-6 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border-hover space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <FolderKanban className="w-5 h-5 text-emerald-500" />
                <span>Projetos em Andamento</span>
              </div>
              <Link href="/projects" className="text-xs font-semibold text-primary hover:underline">
                Ver todos
              </Link>
            </div>

            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum projeto ativo.</p>
              ) : (
                projects.slice(0, 3).map((proj) => (
                  <Link
                    key={proj.id}
                    href="/projects"
                    className="block p-3.5 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {proj.name}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">
                        {proj.progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-border/60 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Courses & Studies */}
          <div className="p-6 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border-hover space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <span>Estudos & Cursos</span>
              </div>
              <Link href="/studies" className="text-xs font-semibold text-primary hover:underline">
                Ver cursos
              </Link>
            </div>

            <div className="space-y-3">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum curso em andamento.</p>
              ) : (
                courses.slice(0, 2).map((c) => (
                  <div key={c.id} className="p-3.5 rounded-lg bg-muted/30 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">{c.name}</span>
                      <span className="text-xs text-indigo-400 font-bold">{c.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-border/60 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Financial Reminders */}
          <div className="p-6 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl glow-border-hover space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <DollarSign className="w-5 h-5 text-teal-400" />
                <span>Contas Próximas</span>
              </div>
              <Link href="/finance" className="text-xs font-semibold text-primary hover:underline">
                Ver finanças
              </Link>
            </div>

            <div className="space-y-2.5">
              {finances.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conta pendente.</p>
              ) : (
                finances.slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30 text-sm"
                  >
                    <div>
                      <span className="font-bold text-foreground block">{f.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(f.dueDate)}</span>
                    </div>
                    <span className="font-bold text-teal-400">
                      {formatCurrency(f.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
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
