"use client";
import { Toaster } from "sonner";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ToastProvider() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-right"
      theme={theme === "dark" ? "dark" : "light"}
      richColors
      closeButton
    />
  );
}
