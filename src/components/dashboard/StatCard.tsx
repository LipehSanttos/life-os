"use client";
import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  href?: string;
  subtitle?: string;
}

export function StatCard({ label, value, icon: Icon, color, href, subtitle }: StatCardProps) {
  const content = (
    <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md shadow-xs hover:shadow-md transition-all hover:border-primary/30 group flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
          {label}
        </span>
        <div
          className="p-2.5 rounded-xl transition-transform group-hover:scale-110 shadow-xs"
          style={{ backgroundColor: `${color}18`, color: color }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground font-medium truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
