import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Life OS - Sistema de Gestão Pessoal & IA",
  description: "Life OS: Gerenciamento inteligente de atividades, compromissos, projetos, estudos, finanças e tarefas cotidianas com inteligência artificial.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "window.__name=window.__name||function(t,v){try{Object.defineProperty(t,'name',{value:v,configurable:true})}catch(e){}return t};",
          }}
        />
      </head>
      <body className={`${inter.className} antialiased selection:bg-primary/20 selection:text-primary`}>
        <ThemeProvider defaultTheme="dark">
          <ToastProvider />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
