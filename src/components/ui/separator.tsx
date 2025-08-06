"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

const Separator: React.FC<SeparatorProps> = ({ 
  className, 
  orientation = "horizontal", 
  decorative = true 
}) => (
  <div
    role={decorative ? "none" : "separator"}
    aria-orientation={orientation}
    className={cn(
      "shrink-0 bg-gray-200",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
  />
);

export { Separator }