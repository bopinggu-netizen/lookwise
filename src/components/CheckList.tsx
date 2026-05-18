"use client";

import type { QualityCheck } from "@/types";
import { IconAlert, IconCheck, IconX } from "@/components/ui/Icons";

const statusConfig = {
  pass: {
    color: "var(--success)",
    bg: "rgba(52, 211, 153, 0.1)",
    border: "rgba(52, 211, 153, 0.25)",
    Icon: IconCheck,
    label: "通过",
  },
  warn: {
    color: "var(--warn)",
    bg: "rgba(251, 191, 36, 0.1)",
    border: "rgba(251, 191, 36, 0.25)",
    Icon: IconAlert,
    label: "警告",
  },
  fail: {
    color: "var(--fail)",
    bg: "rgba(248, 113, 113, 0.1)",
    border: "rgba(248, 113, 113, 0.25)",
    Icon: IconX,
    label: "未通过",
  },
};

interface CheckListProps {
  checks: QualityCheck[];
  compact?: boolean;
}

export function CheckList({ checks, compact = false }: CheckListProps) {
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)]/60 px-4 py-3">
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="font-semibold text-[var(--success)]">{passed}</span>
            <span className="text-[var(--muted)]"> / {checks.length} 通过</span>
          </span>
          {failed > 0 && (
            <span className="rounded-full bg-[var(--fail)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--fail)]">
              {failed} 项未通过
            </span>
          )}
        </div>
        <span className="label-mono text-[var(--muted)]">Quality Matrix</span>
      </div>

      <ul className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {checks.map((check, i) => {
          const cfg = statusConfig[check.status];
          const StatusIcon = cfg.Icon;
          return (
            <li
              key={check.id}
              className="animate-slide-up flex gap-3 rounded-xl border p-3.5 sm:p-4"
              style={{
                animationDelay: `${i * 40}ms`,
                backgroundColor: cfg.bg,
                borderColor: cfg.border,
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
              >
                <StatusIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium sm:text-base">{check.label}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}
                  >
                    {cfg.label}
                  </span>
                </div>
                {!compact && (
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{check.description}</p>
                )}
                <p className="mt-1.5 text-sm leading-snug text-[var(--text)]/85">{check.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
