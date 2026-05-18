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
            <h2 className="mt-1 text-xl font-semibold sm:text-2xl">亚洲常见审美参考报告</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              {result.summary}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {["普通人真实自拍", "娱乐参考", "4.0–7.0 区间"].map((tag) => (
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
          <h3 className="text-base font-semibold sm:text-lg">核心维度分析</h3>
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
            <h3 className="font-medium">拍摄参考建议</h3>
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

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)]/45 p-5 sm:p-6">
        <h3 className="mb-3 font-medium">审美视角参考</h3>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
          <p>
            女性照片 + 男性审美：本次评分参考亚洲常见男性审美偏好中的部分倾向，干净感、眼部吸引力、脸部柔和度、白净感、轻盈感、年轻感和自然甜美感通常更容易形成第一眼好感，但不代表所有男性。
          </p>
          <p>
            男性照片 + 女性审美：本次评分参考亚洲常见女性审美偏好中的部分倾向，清爽干净感、皮肤状态、脸型轮廓、下颌线清晰度、眉眼精神感、发型整洁度和自然阳光感通常更容易形成第一眼好感，但不代表所有女性。
          </p>
          <p>
            综合审美参考：本次评分综合参考协调度、皮肤与干净感、脸型轮廓、眉眼吸引力和自然上镜度，结果仅供娱乐参考。
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)]/45 p-5 sm:p-6">
        <h3 className="mb-3 font-medium">参考依据说明</h3>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
          <p>
            LookWise 的评分模型参考了面部吸引力研究中常见的协调度、对称性、平均化、皮肤健康感、脸型轮廓、眼部吸引力和自然上镜度等维度。亚洲审美部分参考东亚/东南亚审美讨论中较常出现的清透皮肤、年轻感、眼部轮廓、脸型流畅度和整体干净感等偏好。
          </p>
          <p>
            异性视角仅代表常见审美倾向，并不代表所有男性或女性的真实偏好。审美具有明显的主观性、文化差异和时代变化，本评分仅作为普通人真实自拍场景下的娱乐参考。
          </p>
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-[var(--muted)]/60">
        本评分仅针对普通人真实自拍场景，不与明星、网红、精修图或专业摄影作品比较。
      </p>
      <p className="mt-1 text-center text-xs text-[var(--muted)]/50">
        本评分不代表个人价值，不构成医学、美容、择偶或职业建议。不同人、不同地区、不同文化背景下的审美差异很大，请理性看待。
      </p>
    </div>
  );
}
