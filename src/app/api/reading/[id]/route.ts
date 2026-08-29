import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { id } = params;
    const body = await req.json();
    const { title, author, isbn, coverUrl, totalPages, currentPage, progress, status, rating, notes } = body;

    const existing = await prisma.book.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Livro não encontrado." }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (author !== undefined) dataToUpdate.author = author ? author.trim() : null;
    if (isbn !== undefined) dataToUpdate.isbn = isbn ? isbn.trim() : null;
    if (coverUrl !== undefined) dataToUpdate.coverUrl = coverUrl ? coverUrl.trim() : null;
    if (totalPages !== undefined) dataToUpdate.totalPages = Number(totalPages);
    if (currentPage !== undefined) dataToUpdate.currentPage = Number(currentPage);
    if (progress !== undefined) dataToUpdate.progress = Number(progress);
    if (status !== undefined) dataToUpdate.status = status;
    if (rating !== undefined) dataToUpdate.rating = rating ? Number(rating) : null;
    if (notes !== undefined) dataToUpdate.notes = notes;

    const updated = await prisma.book.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar livro." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { id } = params;
    await prisma.book.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true, message: "Livro removido com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao excluir livro." }, { status: 500 });
  }
}
