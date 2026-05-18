"use client";

import { useCallback, useRef, useState } from "react";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { AppHeader } from "@/components/AppHeader";
import { CheckList } from "@/components/CheckList";
import { PhotoUploader, type PhotoUploaderHandle } from "@/components/PhotoUploader";
import { ReuploadButton } from "@/components/ReuploadButton";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { StepPipeline } from "@/components/StepPipeline";
import { analyzePhoto } from "@/lib/imageAnalyzer";
import type { AnalysisPhase, AnalysisResult } from "@/types";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function HomePage() {
  const uploaderRef = useRef<PhotoUploaderHandle>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const resetUpload = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setPhase("idle");
    uploaderRef.current?.reset();
  }, []);

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setResult(null);
    setPhase("idle");
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (!selectedFile) return;

    setResult(null);
    setPhase("loading");

    try {
      await delay(400);
      setPhase("checking");
      await delay(600);

      const analysis = await analyzePhoto(selectedFile);

      if (!analysis.passed) {
        setPhase("rejected");
        setResult(analysis);
        return;
      }

      setResult(analysis);
      setPhase("checked");
    } catch (e) {
      alert(e instanceof Error ? e.message : "分析失败，请重试");
      setPhase("idle");
    }
  }, [selectedFile]);

  const handleContinueScoring = useCallback(async () => {
    if (!result?.passed || phase !== "checked") return;

    setPhase("scoring");
    await delay(800);
    setPhase("done");
  }, [phase, result]);

  const isAnalyzing = ["loading", "checking", "scoring"].includes(phase);
  const showScore = result?.passed && phase === "done";
  const showRejected = phase === "rejected" && result;
  const showPassedChecks = ["checked", "done"].includes(phase) && result;

  return (
    <div className="app-shell safe-bottom">
      <div className="grid-overlay" aria-hidden />

      <main className="mx-auto max-w-5xl px-4 pb-8 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <AppHeader />
        <StepPipeline phase={phase} />

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
          {/* Left: Upload + Progress */}
          <section className="space-y-4 lg:sticky lg:top-6">
            <div className="glass-panel rounded-2xl p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold sm:text-base">图像输入</h2>
                <span className="label-mono text-[var(--muted)]">Input</span>
              </div>
              <PhotoUploader
                ref={uploaderRef}
                onFileSelected={handleFileSelected}
                onReupload={resetUpload}
                disabled={isAnalyzing}
                scanning={isAnalyzing}
                showReuploadBelowPreview={Boolean(selectedFile)}
              />

              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!selectedFile || isAnalyzing}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-4 py-3.5 text-sm font-semibold text-[var(--bg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
              >
                {isAnalyzing ? "分析中…" : "开始检测"}
              </button>
            </div>

            {isAnalyzing && <AnalysisProgress phase={phase} />}
          </section>

          {/* Right: Results */}
          <section className="space-y-4 min-h-[200px]">
            {!result && !isAnalyzing && !selectedFile && (
              <div className="glass-panel flex min-h-[240px] flex-col items-center justify-center rounded-2xl p-8 text-center sm:min-h-[320px]">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] text-2xl text-[var(--muted)]">
                  ◇
                </div>
                <p className="font-medium text-[var(--muted)]">等待图像输入</p>
                <p className="mt-2 max-w-xs text-sm text-[var(--muted)]/70">
                  上传照片后，分析结果将在此面板实时呈现
                </p>
              </div>
            )}

            {showRejected && (
              <div className="animate-slide-up space-y-4">
                <div className="glass-panel-strong rounded-2xl border-[var(--fail)]/30 p-5 sm:p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--fail)]/15 text-[var(--fail)]">
                      ✕
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--fail)]">质量门控未通过</p>
                      <p className="text-sm text-[var(--muted)]">{result.summary}</p>
                    </div>
                  </div>
                </div>
                <div className="glass-panel rounded-2xl p-4 sm:p-5">
                  <h2 className="mb-4 text-sm font-semibold sm:text-base">检测报告</h2>
                  <CheckList checks={result.checks} />
                  <ReuploadButton
                    onClick={resetUpload}
                    className="mt-4"
                    label="换一张照片重新检测"
                  />
                </div>
              </div>
            )}

            {showPassedChecks && result && (
              <div className="animate-slide-up space-y-4">
                {phase === "checked" ? (
                  <div className="glass-panel rounded-2xl p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--success)]/15 text-[var(--success)]">
                        ✓
                      </span>
                      <div>
                        <p className="font-semibold text-[var(--success)]">质量检测通过</p>
                        <p className="text-sm text-[var(--muted)]">
                          未发现阻止评分的问题，轻微提醒项不会影响继续查看。
                        </p>
                      </div>
                    </div>
                    <CheckList checks={result.checks} compact />
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <ReuploadButton
                        onClick={resetUpload}
                        label="重新上传其他照片"
                      />
                      <button
                        type="button"
                        onClick={handleContinueScoring}
                        className="w-full rounded-xl border border-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-4 py-3 text-sm font-medium text-[var(--bg)] transition-opacity hover:opacity-90 active:opacity-85"
                      >
                        继续查看评分
                      </button>
                    </div>
                  </div>
                ) : null}

                {showScore ? (
                  <div className="glass-panel rounded-2xl p-4 sm:p-6">
                    <ScoreDisplay result={result} />
                    <ReuploadButton
                      onClick={resetUpload}
                      className="mt-6"
                      label="重新上传其他照片"
                    />
                  </div>
                ) : null}

                <details className="glass-panel group rounded-2xl p-4 sm:p-5" open={phase === "done"}>
                  <summary className="cursor-pointer list-none text-sm font-semibold sm:text-base [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between">
                      质量检测明细
                      <span className="text-xs font-normal text-[var(--muted)] group-open:hidden">
                        展开
                      </span>
                    </span>
                  </summary>
                  <div className="mt-4">
                    <CheckList checks={result.checks} compact />
                  </div>
                </details>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-12 border-t border-[var(--border)] pt-6 text-center">
          <p className="text-xs text-[var(--muted)]/70">
            所有分析在浏览器本地完成 · 照片不上传服务器
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]/50">
            基于图像启发式算法 · 评分仅供娱乐参考
          </p>
        </footer>
      </main>
    </div>
  );
}
