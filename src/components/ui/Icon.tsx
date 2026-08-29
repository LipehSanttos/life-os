"use client";
import React from "react";
import * as Icons from "lucide-react";
import { LucideProps } from "lucide-react";

interface IconProps extends LucideProps {
  name: string;
}

export function DynamicIcon({ name, ...props }: IconProps) {
  const cleanName = name?.trim();
  const IconComponent = (Icons as any)[cleanName] || Icons.Folder;
  return <IconComponent {...props} />;
}
