"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  icon?: LucideIcon;
};

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
  compact?: boolean;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-6 py-12" : "px-6 py-20",
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex items-center justify-center rounded-2xl bg-secondary",
          compact ? "h-12 w-12" : "h-16 w-16"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            compact ? "h-6 w-6" : "h-8 w-8"
          )}
        />
      </div>

      <h3
        className={cn(
          "mb-1 font-semibold text-foreground",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>

      <p
        className={cn(
          "max-w-sm text-muted-foreground leading-relaxed",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {description}
      </p>

      {actions.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action, i) => {
            const ActionIcon = action.icon;
            const baseClass = cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              action.variant === "secondary"
                ? "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            );

            const content = (
              <>
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                {action.label}
              </>
            );

            if (action.href) {
              return (
                <Link key={i} href={action.href} className={baseClass}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={i}
                type="button"
                onClick={action.onClick}
                className={baseClass}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}