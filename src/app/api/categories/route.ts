import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_CATEGORIES = [
  { id: "cat_saude", name: "Saúde", slug: "saude", color: "#10b981", icon: "Heart", sortOrder: 1 },
  { id: "cat_faculdade", name: "Faculdade", slug: "faculdade", color: "#3b82f6", icon: "GraduationCap", sortOrder: 2 },
  { id: "cat_trabalho", name: "Trabalho", slug: "trabalho", color: "#6366f1", icon: "Briefcase", sortOrder: 3 },
  { id: "cat_freelance", name: "Freelance", slug: "freelance", color: "#8b5cf6", icon: "Laptop", sortOrder: 4 },
  { id: "cat_estudos", name: "Estudos", slug: "estudos", color: "#06b6d4", icon: "BookOpen", sortOrder: 5 },
  { id: "cat_compras", name: "Compras", slug: "compras", color: "#f59e0b", icon: "ShoppingCart", sortOrder: 6 },
  { id: "cat_casa", name: "Casa", slug: "casa", color: "#ec4899", icon: "Home", sortOrder: 7 },
  { id: "cat_financas", name: "Finanças", slug: "financas", color: "#14b8a6", icon: "DollarSign", sortOrder: 8 },
  { id: "cat_aniversarios", name: "Aniversários", slug: "aniversarios", color: "#f43f5e", icon: "Cake", sortOrder: 9 },
  { id: "cat_outros", name: "Outros", slug: "outros", color: "#64748b", icon: "Folder", sortOrder: 10 },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    let categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // Se a categoria de aniversários ou categorias padrão não existirem, provisiona automaticamente
    const hasAniversarios = categories.some(
      (c) => c.slug === "aniversarios" || c.name.toLowerCase().includes("aniversár")
    );

    if (!hasAniversarios) {
      try {
        await prisma.category.create({
          data: {
            id: "cat_aniversarios",
            name: "Aniversários",
            slug: "aniversarios",
            color: "#f43f5e",
            icon: "Cake",
            sortOrder: 9,
          },
        });
        categories = await prisma.category.findMany({
          orderBy: { sortOrder: "asc" },
        });
      } catch {
        // Ignora caso já tenha sido criado em concorrência
      }
    }

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar categorias." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const { name, color = "#6366f1", icon = "Folder", sortOrder = 0 } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "O nome da categoria é obrigatório." }, { status: 400 });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        color,
        icon,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar categoria." }, { status: 500 });
  }
}
