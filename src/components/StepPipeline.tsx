"use client";

import type { AnalysisPhase } from "@/types";

const pipeline = [
  { id: "upload", label: "上传", phases: ["idle"] as AnalysisPhase[] },
  { id: "scan", label: "检测", phases: ["loading", "checking"] as AnalysisPhase[] },
  { id: "checked", label: "完成", phases: ["checked"] as AnalysisPhase[] },
  { id: "score", label: "评分", phases: ["scoring"] as AnalysisPhase[] },
  { id: "report", label: "报告", phases: ["done", "rejected"] as AnalysisPhase[] },
];

interface StepPipelineProps {
  phase: AnalysisPhase;
}

export function StepPipeline({ phase }: StepPipelineProps) {
  const activeIdx = pipeline.findIndex((p) => p.phases.includes(phase));
  const current = activeIdx === -1 ? 0 : activeIdx;

  return (
    <nav aria-label="分析流程" className="mb-6 overflow-x-auto pb-1 -mx-1 px-1">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {pipeline.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step.id} className="flex items-center gap-1 sm:gap-2">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                  active
                    ? "border border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]"
                    : done
                      ? "text-[var(--success)]"
                      : "text-[var(--muted)]"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold sm:h-6 sm:w-6 sm:text-xs ${
                    active
                      ? "bg-[var(--accent)] text-[var(--bg)]"
                      : done
                        ? "bg-[var(--success)]/20 text-[var(--success)]"
                        : "bg-[var(--surface-2)]"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {step.label}
              </div>
              {i < pipeline.length - 1 && (
                <span
                  className={`h-px w-4 sm:w-8 ${done ? "bg-[var(--success)]/50" : "bg-[var(--border)]"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
