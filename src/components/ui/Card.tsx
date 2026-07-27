import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-white rounded-[20px] shadow-card border border-surface-100",
        padded && "p-6",
        className
      )}
      {...props}
    />
  );
}
