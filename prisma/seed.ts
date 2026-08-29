import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Populando banco de dados com usuário admin e dados iniciais...");

  // Seed default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "eduardo.felipe@lifeos.com" },
    update: {
      name: "Eduardo Felipe",
      role: "ADMIN",
    },
    create: {
      name: "Eduardo Felipe",
      email: "eduardo.felipe@lifeos.com",
      passwordHash: hashPassword("123456"),
      role: "ADMIN",
    },
  });

  await prisma.userSettings.upsert({
    where: { id: "user_default" },
    update: {
      name: "Eduardo Felipe",
      email: "eduardo.felipe@lifeos.com",
    },
    create: {
      id: "user_default",
      name: "Eduardo Felipe",
      email: "eduardo.felipe@lifeos.com",
      theme: "dark",
      autoConfirmAiActions: false,
      notificationsEnabled: true,
    },
  });

  const defaultCategories = [
    { name: "Estudos", slug: "estudos", color: "#8b5cf6", icon: "GraduationCap", isSystem: true, sortOrder: 1 },
    { name: "Faculdade", slug: "faculdade", color: "#ec4899", icon: "BookOpenCheck", isSystem: true, sortOrder: 2 },
    { name: "Cursos", slug: "cursos", color: "#3b82f6", icon: "Laptop", isSystem: true, sortOrder: 3 },
    { name: "Trabalho", slug: "trabalho", color: "#0ea5e9", icon: "Briefcase", isSystem: true, sortOrder: 4 },
    { name: "Freelance", slug: "freelance", color: "#10b981", icon: "DollarSign", isSystem: true, sortOrder: 5 },
    { name: "Pessoal", slug: "pessoal", color: "#f59e0b", icon: "User", isSystem: true, sortOrder: 6 },
    { name: "Saúde", slug: "saude", color: "#ef4444", icon: "HeartPulse", isSystem: true, sortOrder: 7 },
    { name: "Finanças", slug: "financas", color: "#14b8a6", icon: "Wallet", isSystem: true, sortOrder: 8 },
    { name: "Casa", slug: "casa", color: "#d946ef", icon: "Home", isSystem: true, sortOrder: 9 },
    { name: "Compras", slug: "compras", color: "#64748b", icon: "ShoppingCart", isSystem: true, sortOrder: 10 },
    { name: "Projetos", slug: "projetos", color: "#6366f1", icon: "FolderKanban", isSystem: true, sortOrder: 11 },
    { name: "Leitura", slug: "leitura", color: "#84cc16", icon: "BookOpen", isSystem: true, sortOrder: 12 },
    { name: "Outros", slug: "outros", color: "#94a3b8", icon: "Folder", isSystem: true, sortOrder: 13 },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, color: cat.color, icon: cat.icon },
      create: cat,
    });
  }

  // Link existing unassigned tasks, projects, courses, books, finances to the Admin user
  await prisma.task.updateMany({
    where: { userId: null },
    data: { userId: adminUser.id },
  });
  await prisma.project.updateMany({
    where: { userId: null },
    data: { userId: adminUser.id },
  });
  await prisma.course.updateMany({
    where: { userId: null },
    data: { userId: adminUser.id },
  });
  await prisma.book.updateMany({
    where: { userId: null },
    data: { userId: adminUser.id },
  });
  await prisma.financialReminder.updateMany({
    where: { userId: null },
    data: { userId: adminUser.id },
  });
  await prisma.chatSession.updateMany({
    where: { userId: null },
    data: { userId: adminUser.id },
  });

  console.log("✅ Seed com isolamento multi-tenant concluído!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
