"use client";

interface ScanOverlayProps {
  active?: boolean;
  label?: string;
}

export function ScanOverlay({ active = true, label = "AI 扫描中" }: ScanOverlayProps) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl">
      <span className="scan-corner scan-corner-tl" />
      <span className="scan-corner scan-corner-tr" />
      <span className="scan-corner scan-corner-bl" />
      <span className="scan-corner scan-corner-br" />
      <div className="scan-line" />
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/50 px-2 py-1 backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--scan)] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--scan)]" />
        </span>
        <span className="label-mono text-[10px] text-[var(--scan)]">{label}</span>
      </div>
    </div>
  );
}
