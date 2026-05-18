"use client";

import type { AnalysisPhase } from "@/types";
import { IconCpu } from "@/components/ui/Icons";

const steps: { phase: AnalysisPhase; label: string; sub: string }[] = [
  { phase: "loading", label: "图像载入", sub: "Image Buffer" },
  { phase: "checking", label: "质量检测", sub: "Quality Gate" },
  { phase: "scoring", label: "颜值建模", sub: "Aesthetic Model" },
];

interface AnalysisProgressProps {
  phase: AnalysisPhase;
}

export function AnalysisProgress({ phase }: AnalysisProgressProps) {
  if (phase === "idle" || phase === "done" || phase === "rejected") return null;

  const activeIndex = steps.findIndex((s) => s.phase === phase);
  const progress = ((activeIndex + 1) / steps.length) * 100;

  return (
    <div className="glass-panel animate-slide-up rounded-2xl p-5 sm:p-6" style={{ animationDelay: "0ms" }}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-solid)] text-[var(--accent)]">
            <IconCpu className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--scan)] animate-ping" />
          </div>
          <div>
            <p className="label-mono text-[var(--accent)]">Processing</p>
            <p className="text-sm font-medium sm:text-base">AI 引擎分析中</p>
          </div>
        </div>
        <span className="label-mono tabular-nums text-[var(--muted)]">{Math.round(progress)}%</span>
      </div>

      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        >
          <span className="absolute inset-0 shimmer-bar opacity-60" />
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li
              key={step.phase}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors sm:px-4 ${
                active
                  ? "border border-[var(--border-strong)] bg-[var(--accent)]/5"
                  : done
                    ? "opacity-80"
                    : "opacity-40"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold sm:h-9 sm:w-9 ${
                  done
                    ? "bg-[var(--success)]/15 text-[var(--success)]"
                    : active
                      ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                {done ? "✓" : String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm font-medium sm:text-base ${active ? "text-[var(--text)]" : ""}`}>
                    {step.label}
                  </span>
                  <span className="label-mono hidden text-[var(--muted)] sm:inline">{step.sub}</span>
                </div>
                {active && (
                  <p className="mt-0.5 text-xs text-[var(--scan)] animate-pulse">运行中…</p>
                )}
              </div>
              {active && (
                <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
