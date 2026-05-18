"use client";

interface ReuploadButtonProps {
  onClick: () => void;
  className?: string;
}

export function ReuploadButton({ onClick, className = "" }: ReuploadButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border border-[var(--accent)]/40 bg-transparent px-4 py-3 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 active:bg-[var(--accent)]/15 ${className}`}
    >
      重新上传照片
    </button>
  );
}
