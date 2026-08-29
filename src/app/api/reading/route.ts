import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const books = await prisma.book.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(books);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar livros." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { title, author, isbn, coverUrl, totalPages = 100, categoryId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Título do livro é obrigatório." }, { status: 400 });
    }

    const book = await prisma.book.create({
      data: {
        userId: user.id,
        title: title.trim(),
        author: author ? author.trim() : null,
        isbn: isbn ? isbn.trim() : null,
        coverUrl: coverUrl ? coverUrl.trim() : null,
        totalPages: Number(totalPages) || 100,
        currentPage: 0,
        progress: 0,
        categoryId: categoryId || null,
      },
      include: { category: true },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao cadastrar livro." }, { status: 500 });
  }
}
