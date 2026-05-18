"use client";

import { IconCpu, IconShield, IconSparkles } from "@/components/ui/Icons";

export function AppHeader() {
  return (
    <header className="mb-8 sm:mb-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-solid)] text-[var(--accent)] sm:h-10 sm:w-10">
            <IconSparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold sm:text-base">LookWise</p>
            <p className="label-mono text-[var(--muted)]">Asian Aesthetic Reference</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2.5 py-1 text-[10px] font-medium text-[var(--success)] sm:text-xs">
          <IconShield className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">本地分析</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
        <span className="text-gradient">真实自拍</span>
        <span className="text-[var(--text)]"> 审美参考评分</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
        面向普通人真实自拍场景，参考亚洲常见审美偏好中的倾向，输出 4.0–7.0 娱乐参考指数。
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { icon: IconCpu, text: "端侧推理" },
          { icon: IconShield, text: "隐私安全" },
        ].map(({ icon: Icon, text }) => (
          <span
            key={text}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)]/60 px-3 py-1.5 text-xs text-[var(--muted)]"
          >
            <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
            {text}
          </span>
        ))}
      </div>
    </header>
  );
}
