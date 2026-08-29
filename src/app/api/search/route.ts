import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length === 0) {
      return NextResponse.json({ tasks: [], projects: [], courses: [], books: [], finances: [] });
    }

    const [tasks, projects, courses, books, finances] = await Promise.all([
      prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { academicSubject: { contains: q } },
            { clientName: { contains: q } },
          ],
        },
        include: { category: true, project: true },
        take: 8,
      }),
      prisma.project.findMany({
        where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
        include: { category: true },
        take: 5,
      }),
      prisma.course.findMany({
        where: { OR: [{ name: { contains: q } }, { institution: { contains: q } }] },
        include: { category: true },
        take: 5,
      }),
      prisma.book.findMany({
        where: { OR: [{ title: { contains: q } }, { author: { contains: q } }] },
        include: { category: true },
        take: 5,
      }),
      prisma.financialReminder.findMany({
        where: { OR: [{ title: { contains: q } }, { recipient: { contains: q } }] },
        include: { category: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({ tasks, projects, courses, books, finances });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro na busca global." }, { status: 500 });
  }
}
