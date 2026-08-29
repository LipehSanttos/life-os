import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const courses = await prisma.course.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        tasks: {
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(courses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar cursos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { name, institution, totalModules = 1, categoryId, dueDate } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nome do curso/disciplina é obrigatório." }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        userId: user.id,
        name: name.trim(),
        institution: institution ? institution.trim() : null,
        totalModules: Number(totalModules) || 1,
        currentModule: 0,
        progress: 0,
        categoryId: categoryId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { category: true, tasks: true },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao criar curso." }, { status: 500 });
  }
}
