import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { startOfDay, endOfDay, addDays } from "date-fns";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const now = new Date();
    const [
      todayCount,
      upcomingCount,
      overdueCount,
      highCount,
      activeProjectsCount,
      inProgressCoursesCount,
      inboxCount,
      completedTotal,
      pendingTotal,
    ] = await Promise.all([
      prisma.task.count({
        where: {
          userId: user.id,
          dueDate: { gte: startOfDay(now), lte: endOfDay(now) },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
      prisma.task.count({
        where: {
          userId: user.id,
          dueDate: { gte: startOfDay(now), lte: endOfDay(addDays(now, 7)) },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
      prisma.task.count({
        where: {
          userId: user.id,
          dueDate: { lt: startOfDay(now) },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
      prisma.task.count({
        where: {
          userId: user.id,
          priority: { in: ["HIGH", "URGENT"] },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
      prisma.project.count({
        where: {
          userId: user.id,
          status: "ACTIVE",
        },
      }),
      prisma.course.count({
        where: {
          userId: user.id,
          status: "IN_PROGRESS",
        },
      }),
      prisma.task.count({
        where: {
          userId: user.id,
          isInbox: true,
          status: "PENDING",
        },
      }),
      prisma.task.count({
        where: { userId: user.id, status: "COMPLETED" },
      }),
      prisma.task.count({
        where: { userId: user.id, status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),
    ]);

    return NextResponse.json({
      todayCount,
      upcomingCount,
      overdueCount,
      highCount,
      activeProjectsCount,
      inProgressCoursesCount,
      inboxCount,
      completedTotal,
      pendingTotal,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao calcular estatísticas." }, { status: 500 });
  }
}
