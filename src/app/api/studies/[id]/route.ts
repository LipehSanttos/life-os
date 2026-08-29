import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const existing = await prisma.course.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });
    }

    const { name, institution, totalModules, currentModule, status, startDate, dueDate, notes, links, categoryId } = body;

    const tModules = totalModules !== undefined ? Math.max(1, parseInt(totalModules)) : existing.totalModules;
    const cModule = currentModule !== undefined ? Math.min(tModules, Math.max(0, parseInt(currentModule))) : existing.currentModule;
    const progress = Math.round((cModule / tModules) * 100);

    const updated = await prisma.course.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        institution: institution !== undefined ? institution : existing.institution,
        totalModules: tModules,
        currentModule: cModule,
        progress,
        status: status !== undefined ? status : (progress >= 100 ? "COMPLETED" : existing.status),
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : existing.startDate,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
        notes: notes !== undefined ? notes : existing.notes,
        links: links !== undefined ? (Array.isArray(links) ? JSON.stringify(links) : links) : existing.links,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
      },
      include: { category: true, tasks: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar curso." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.course.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao excluir curso." }, { status: 500 });
  }
}
