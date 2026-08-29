import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        tasks: {
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar projetos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { name, description, priority = "MEDIUM", categoryId, dueDate, color, icon } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nome do projeto é obrigatório." }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description ? description.trim() : null,
        priority,
        categoryId: categoryId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        color: color || "#3b82f6",
        icon: icon || "Briefcase",
      },
      include: { category: true, tasks: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao criar projeto." }, { status: 500 });
  }
}
