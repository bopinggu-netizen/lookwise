"use client";

import type { AnalysisResult } from "@/types";

interface ScoreDisplayProps {
  result: AnalysisResult;
}

export function ScoreDisplay({ result }: ScoreDisplayProps) {
  if (result.score === null) return null;

  const score = result.score;
  const scorePct = ((score - 4) / 3) * 100;

  return (
    <div className="animate-slide-up space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-[var(--accent-2)]/10 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div className="relative flex h-40 w-40 shrink-0 items-center justify-center sm:h-44 sm:w-44">
            <div
              className="score-ring-track absolute inset-0 rounded-full p-[3px]"
              style={{ "--score-pct": scorePct } as React.CSSProperties}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--bg-elevated)]">
                <div className="text-center">
                  <span className="text-5xl font-bold tabular-nums tracking-tight text-gradient sm:text-6xl">
                    {score.toFixed(1)}
                  </span>
                  <p className="label-mono mt-1 text-[var(--muted)]">Aesthetic Index</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface-solid)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
              {result.percentile}
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <p className="label-mono text-[var(--accent)]">Analysis Complete</p>
            <h2 className="mt-1 text-xl font-semibold sm:text-2xl">颜值参考报告</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              {result.summary}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {["普通人自拍", "真实素颜", "4.0–7.0 区间"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-solid)]/80 px-3 py-1 text-xs text-[var(--muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold sm:text-lg">多维特征分析</h3>
          <span className="label-mono text-[var(--muted)]">Feature Vector</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {result.dimensions.map((dim, i) => (
            <div
              key={dim.name}
              className="animate-slide-up glass-panel rounded-xl p-4 sm:p-5"
              style={{ animationDelay: `${100 + i * 60}ms` }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-medium">{dim.name}</span>
                <span className="text-lg font-bold tabular-nums text-[var(--accent)]">
                  {dim.score}
                </span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="bar-animate h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]"
                  style={{ width: `${dim.score}%`, animationDelay: `${200 + i * 80}ms` }}
                />
              </div>
              <p className="text-sm leading-relaxed text-[var(--muted)]">{dim.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {result.tips.length > 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-solid)]/50 p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)]/15 text-xs text-[var(--accent)]">
              AI
            </span>
            <h3 className="font-medium">智能优化建议</h3>
          </div>
          <ul className="space-y-2.5">
            {result.tips.map((tip, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm leading-relaxed text-[var(--muted)] before:mt-2 before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-[var(--accent)] before:content-['']"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-center text-xs leading-relaxed text-[var(--muted)]/60">
        本评分仅针对普通人真实自拍场景，不与明星、网红、精修图或专业摄影作品对比。
      </p>
      <p className="mt-1 text-center text-xs text-[var(--muted)]/50">
        7.0 已经是普通人区间的极高参考分，不代表明星级颜值。评分仅供娱乐与自我参考。
      </p>
    </div>
  );
}
