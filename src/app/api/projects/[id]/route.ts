import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const existing = await prisma.project.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const { name, description, color, icon, priority, status, progress, startDate, dueDate, notes, links, categoryId } = body;

    const updated = await prisma.project.update({
      where: { id: params.id },
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao excluir projeto." }, { status: 500 });
  }
}
