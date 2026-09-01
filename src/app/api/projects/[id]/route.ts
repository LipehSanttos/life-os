import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { id } = await params;
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: {
        category: true,
        tasks: {
          include: {
            subtasks: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar projeto." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });

    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const { name, description, color, icon, priority, status, progress, startDate, dueDate, notes, links, categoryId } = body;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        color: color !== undefined ? color : existing.color,
        icon: icon !== undefined ? icon : existing.icon,
        priority: priority !== undefined ? priority : existing.priority,
        status: status !== undefined ? status : existing.status,
        progress: progress !== undefined ? progress : existing.progress,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : existing.startDate,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
        notes: notes !== undefined ? notes : existing.notes,
        links: links !== undefined ? (Array.isArray(links) ? JSON.stringify(links) : links) : existing.links,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
      },
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar projeto." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { id } = await params;
    await prisma.project.deleteMany({ where: { id, userId: user.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao excluir projeto." }, { status: 500 });
  }
}
