"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ReuploadButton } from "@/components/ReuploadButton";
import { ScanOverlay } from "@/components/ScanOverlay";
import { IconUpload } from "@/components/ui/Icons";

export interface PhotoUploaderHandle {
  reset: () => void;
  openFilePicker: () => void;
}

interface PhotoUploaderProps {
  onFileSelected: (file: File) => void;
  onReupload?: () => void;
  disabled?: boolean;
  scanning?: boolean;
  showReuploadBelowPreview?: boolean;
}

const tips = [
  { id: "1", text: "正脸无遮挡" },
  { id: "2", text: "无美颜滤镜" },
  { id: "3", text: "自然光线" },
  { id: "4", text: "单人素颜" },
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function resolveFileType(file: File): string {
  if (file.type === "image/jpg") return "image/jpeg";
  if (file.type && ALLOWED_TYPES.includes(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "";
}

export const PhotoUploader = forwardRef<PhotoUploaderHandle, PhotoUploaderProps>(
  function PhotoUploader(
    {
      onFileSelected,
      onReupload,
      disabled,
      scanning = false,
      showReuploadBelowPreview = false,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [previewError, setPreviewError] = useState<string>("");

    const resetLocalPreview = useCallback(() => {
      setPreviewUrl("");
      setPreviewError("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        reset: resetLocalPreview,
        openFilePicker: () => {
          if (!disabled) inputRef.current?.click();
        },
      }),
      [disabled, resetLocalPreview]
    );

    const readFileAsPreview = useCallback(
      (file: File) => {
        if (disabled) return;

        setPreviewError("");
        setPreviewUrl("");

        if (file.size > 12 * 1024 * 1024) {
          setPreviewError("图片大小不能超过 12MB");
          return;
        }

        const fileType = resolveFileType(file);
        if (!ALLOWED_TYPES.includes(fileType)) {
          setPreviewError("暂不支持该图片格式，请上传 JPG、PNG 或 WebP 图片");
          return;
        }

        const reader = new FileReader();

        reader.onload = () => {
          setPreviewUrl(reader.result as string);
          setPreviewError("");
          onFileSelected(file);
        };

        reader.onerror = () => {
          setPreviewError("图片读取失败，请重新选择 JPG/PNG 图片");
        };

        reader.readAsDataURL(file);
      },
      [disabled, onFileSelected]
    );

    const handleFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        readFileAsPreview(file);
        e.currentTarget.value = "";
      },
      [readFileAsPreview]
    );

    const onDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;
        readFileAsPreview(file);
      },
      [readFileAsPreview]
    );

    const openFilePicker = useCallback(() => {
      if (disabled) return;
      inputRef.current?.click();
    }, [disabled]);

    const handleReupload = useCallback(() => {
      resetLocalPreview();
      onReupload?.();
    }, [resetLocalPreview, onReupload]);

    const hasPreview = Boolean(previewUrl && !previewError);

    return (
      <div className="space-y-3">
        <div
          role="button"
          tabIndex={0}
          aria-label="上传照片"
          className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
            dragOver
              ? "border-[var(--accent)] shadow-[0_0_32px_var(--accent-glow)]"
              : "border-[var(--border)] hover:border-[var(--border-strong)]"
          } ${disabled ? "pointer-events-none opacity-60" : "cursor-pointer active:scale-[0.99]"}`}
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            disabled={disabled}
            onChange={handleFileChange}
            onClick={(e) => e.stopPropagation()}
          />

          {hasPreview ? (
            <div className="relative mx-auto aspect-[3/4] w-full max-h-[min(420px,55vh)] sm:max-h-[480px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="待分析照片"
                className="h-full w-full object-cover object-[center_20%]"
                onError={() => {
                  setPreviewError("图片加载失败，请重新选择 JPG/PNG 图片");
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/90 via-transparent to-[var(--bg)]/20 pointer-events-none" />
              <ScanOverlay active={scanning} label="NEURAL SCAN" />
            </div>
          ) : previewError ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 bg-[var(--surface-solid)] px-6 py-12 text-center sm:min-h-[320px]">
              <p className="text-sm font-medium text-[var(--fail)]">{previewError}</p>
              {onReupload && !disabled && (
                <ReuploadButton onClick={handleReupload} className="max-w-xs" />
              )}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-5 px-5 py-12 sm:min-h-[320px] sm:py-16">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-[var(--accent)]/20 blur-xl animate-pulse-glow" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-solid)] text-[var(--accent)] sm:h-20 sm:w-20">
                  <IconUpload className="h-8 w-8 sm:h-9 sm:w-9" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold sm:text-xl">上传正脸素颜照</p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
                  拖拽到此处，或点击选择
                  <span className="hidden sm:inline"> · 最大 12MB</span>
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {tips.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-solid)]/80 px-3 py-1.5 text-xs text-[var(--muted)]"
                  >
                    {t.text}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {showReuploadBelowPreview && hasPreview && onReupload && !disabled && (
          <ReuploadButton onClick={handleReupload} />
        )}
      </div>
    );
  }
);
