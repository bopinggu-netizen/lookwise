"use client";

interface ReuploadButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
  variant?: "outline" | "primary";
}

export function ReuploadButton({
  onClick,
  className = "",
  label = "重新上传照片",
  variant = "outline",
}: ReuploadButtonProps) {
  const variantClass =
    variant === "primary"
      ? "border-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--bg)] hover:opacity-90 active:opacity-85"
      : "border-[var(--accent)]/40 bg-transparent text-[var(--accent)] hover:bg-[var(--accent)]/10 active:bg-[var(--accent)]/15";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${variantClass} ${className}`}
    >
      {label}
    </button>
  );
}
