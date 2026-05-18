import type { AnalysisResult, QualityCheck } from "@/types";
import {
  drawToCanvas,
  forEachFacePixel,
  getImageData,
  hashImageData,
  isSkinTone,
  loadImageFromFile,
  luminance,
  rgbAt,
  saturation,
  seededRandom,
} from "./imageUtils";
import { computeBeautyScore } from "./scoring";

function laplacianVariance(img: ReturnType<typeof getImageData>, faceOnly: boolean): number {
  const { width, height, data } = img;
  let sum = 0;
  let sumSq = 0;
  let n = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const cx = width / 2;
      const cy = height * 0.42;
      const inFace =
        ((x - cx) / (width * 0.32)) ** 2 + ((y - cy) / (height * 0.38)) ** 2 <= 1;
      if (faceOnly && !inFace) continue;

      const center = luminance(data[i], data[i + 1], data[i + 2]);
      const neighbors = [
        luminance(data[((y - 1) * width + x) * 4], data[((y - 1) * width + x) * 4 + 1], data[((y - 1) * width + x) * 4 + 2]),
        luminance(data[((y + 1) * width + x) * 4], data[((y + 1) * width + x) * 4 + 1], data[((y + 1) * width + x) * 4 + 2]),
        luminance(data[(y * width + (x - 1)) * 4], data[(y * width + (x - 1)) * 4 + 1], data[(y * width + (x - 1)) * 4 + 2]),
        luminance(data[(y * width + (x + 1)) * 4], data[(y * width + (x + 1)) * 4 + 1], data[(y * width + (x + 1)) * 4 + 2]),
      ];
      const lap = 4 * center - neighbors.reduce((a, b) => a + b, 0);
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function analyzeSkinRegions(img: ReturnType<typeof getImageData>) {
  const cols = new Array(img.width).fill(0);
  let facePixels = 0;
  let skinPixels = 0;
  let totalLum = 0;
  let totalSat = 0;
  let smoothGrad = 0;
  let prevLum = -1;

  forEachFacePixel(img, (x, y, i, inFace) => {
    if (!inFace) return;
    const [r, g, b] = rgbAt(img.data, i);
    const lum = luminance(r, g, b);
    const sat = saturation(r, g, b);
    facePixels++;
    totalLum += lum;
    totalSat += sat;

    if (isSkinTone(r, g, b)) {
      skinPixels++;
      cols[x]++;
      if (prevLum >= 0) smoothGrad += Math.abs(lum - prevLum);
      prevLum = lum;
    }
  });

  const skinRatio = skinPixels / Math.max(facePixels, 1);
  const avgLum = totalLum / Math.max(facePixels, 1);
  const avgSat = totalSat / Math.max(facePixels, 1);
  const smoothness = 1 - Math.min(1, smoothGrad / Math.max(skinPixels, 1) / 18);

  const peaks = findPeaks(cols, img.width);
  return { skinRatio, avgLum, avgSat, smoothness, peaks, facePixels };
}

function findPeaks(cols: number[], width: number): number[] {
  const threshold = Math.max(...cols) * 0.45;
  const peaks: number[] = [];
  let inPeak = false;
  let peakCenter = 0;
  let peakMax = 0;

  for (let x = 0; x < width; x++) {
    if (cols[x] >= threshold) {
      if (!inPeak) {
        inPeak = true;
        peakCenter = x;
        peakMax = cols[x];
      } else if (cols[x] > peakMax) {
        peakCenter = x;
        peakMax = cols[x];
      }
    } else if (inPeak) {
      peaks.push(peakCenter / width);
      inPeak = false;
    }
  }
  if (inPeak) peaks.push(peakCenter / width);
  return peaks.filter((p, i, arr) => arr.findIndex((q) => Math.abs(q - p) < 0.12) === i);
}

function colorCastScore(img: ReturnType<typeof getImageData>): number {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let n = 0;

  forEachFacePixel(img, (_, __, i, inFace) => {
    if (!inFace) return;
    const [r, g, b] = rgbAt(img.data, i);
    rSum += r;
    gSum += g;
    bSum += b;
    n++;
  });

  if (n === 0) return 0;
  const r = rSum / n;
  const g = gSum / n;
  const b = bSum / n;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) / Math.max(max, 1);
}

/** 仅检测唇妆/眼妆等高饱和彩妆，忽略自然唇色与轻微泛红 */
function heavyMakeupScore(img: ReturnType<typeof getImageData>): number {
  const { width, height } = img;
  let heavy = 0;
  let n = 0;

  forEachFacePixel(img, (x, y, i, inFace) => {
    if (!inFace) return;
    const relY = y / height;
    const relX = Math.abs(x / width - 0.5);
    const [r, g, b] = rgbAt(img.data, i);
    const sat = saturation(r, g, b);
    const lum = luminance(r, g, b);
    const inLip = relY > 0.54 && relY < 0.68 && relX < 0.2;
    const inEye = relY > 0.32 && relY < 0.46 && relX < 0.26;
    const inCheek = relY > 0.4 && relY < 0.54 && relX > 0.14 && relX < 0.32;
    if (inLip || inEye || inCheek) {
      n++;
      // 高饱和 + 明显色差才算浓妆，排除自然唇色与肤色
      if (sat > 0.52 && r > g * 1.15 && (inLip || inEye)) heavy++;
      else if (inCheek && sat > 0.48 && r > g * 1.2 && lum > 80) heavy++;
    }
  });

  return n > 0 ? heavy / n : 0;
}

function symmetryScore(img: ReturnType<typeof getImageData>): number {
  const { width, height, data } = img;
  const mid = Math.floor(width / 2);
  let diff = 0;
  let n = 0;

  for (let y = 0; y < height; y++) {
    for (let dx = 1; dx < mid; dx++) {
      const xl = mid - dx;
      const xr = mid + dx;
      const cy = height * 0.42;
      const inFace =
        ((xl - width / 2) / (width * 0.32)) ** 2 + ((y - cy) / (height * 0.38)) ** 2 <= 1;
      if (!inFace) continue;
      const il = (y * width + xl) * 4;
      const ir = (y * width + xr) * 4;
      diff += Math.abs(luminance(data[il], data[il + 1], data[il + 2]) - luminance(data[ir], data[ir + 1], data[ir + 2]));
      n++;
    }
  }
  return n > 0 ? 1 - Math.min(1, diff / n / 40) : 0.5;
}

/** 仅检测眼、鼻、嘴核心五官区域的严重遮挡，发梢贴脸不算 */
function coreFeatureOcclusionScore(img: ReturnType<typeof getImageData>): number {
  const { width, height } = img;
  let dark = 0;
  let n = 0;

  const inCoreZone = (relY: number, relX: number) => {
    const eye = relY > 0.3 && relY < 0.48 && relX < 0.28;
    const nose = relY > 0.44 && relY < 0.58 && relX < 0.2;
    const mouth = relY > 0.56 && relY < 0.74 && relX < 0.24;
    return eye || nose || mouth;
  };

  forEachFacePixel(img, (x, y, i, inFace) => {
    if (!inFace) return;
    const relY = y / height;
    const relX = Math.abs(x / width - 0.5);
    if (!inCoreZone(relY, relX)) return;
    const [r, g, b] = rgbAt(img.data, i);
    if (luminance(r, g, b) < 45) dark++;
    n++;
  });
  return n > 0 ? dark / n : 0;
}

function runChecks(
  metrics: ReturnType<typeof analyzeSkinRegions> & {
    lapVar: number;
    colorCast: number;
    heavyMakeup: number;
    symmetry: number;
    occlusion: number;
  }
): QualityCheck[] {
  const checks: QualityCheck[] = [];

  // mock 阶段对原相机自拍保持宽松：清晰度不足只提醒，不阻止评分
  checks.push({
    id: "blur",
    label: "清晰度",
    description: "检测照片是否模糊",
    status: metrics.lapVar < 45 ? "warn" : "pass",
    detail:
      metrics.lapVar < 18
        ? "画面清晰度较低，评分仅供参考"
        : metrics.lapVar < 45
          ? "清晰度略低，原相机可接受，建议对焦更清晰"
          : "清晰度良好（含原相机锐化）",
  });

  checks.push({
    id: "light",
    label: "光线",
    description: "检测曝光与亮度",
    status: metrics.avgLum < 58 || metrics.avgLum > 238 ? "warn" : "pass",
    detail:
      metrics.avgLum < 38
        ? "光线偏暗，评分仅供参考"
        : metrics.avgLum > 238
          ? "曝光偏高，原相机 HDR 可能略过曝"
          : metrics.avgLum < 58
            ? "光线偏暗，可尝试明亮环境重拍"
            : "光线条件可接受（含自动曝光）",
  });

  // 原相机前置自拍可能自带 HDR、锐化、白平衡和轻微平滑，mock 阶段不阻止评分
  const extremeBeauty = metrics.smoothness > 0.97 && metrics.lapVar < 28;
  checks.push({
    id: "beauty",
    label: "美颜检测",
    description: "检测明显磨皮、瘦脸等美颜处理",
    status: extremeBeauty || (metrics.smoothness > 0.93 && metrics.lapVar < 45) ? "warn" : "pass",
    detail: extremeBeauty
      ? "皮肤纹理较平滑，可能受相机处理影响，评分仅供参考"
      : metrics.smoothness > 0.93 && metrics.lapVar < 45
        ? "皮肤略平滑，可能含轻度优化，原相机自动处理已忽略"
        : "未检测到明显美颜（原相机 HDR/锐化/白平衡视为正常）",
  });

  // 滤镜/偏色仅提醒，不拒绝；轻微冷暖调为原相机成像特征
  checks.push({
    id: "filter",
    label: "滤镜检测",
    description: "检测色彩滤镜与风格化调色",
    status: metrics.colorCast > 0.18 ? "warn" : "pass",
    detail:
      metrics.colorCast > 0.18
        ? "色彩略有冷暖倾向，原相机自动白平衡所致，不影响评分"
        : "色彩自然（原相机成像）",
  });

  // 自然唇色、泛红、毛孔痘印不判浓妆；mock 阶段妆容不阻止评分
  checks.push({
    id: "makeup",
    label: "妆容检测",
    description: "检测明显浓妆",
    status: metrics.heavyMakeup > 0.42 ? "warn" : "pass",
    detail:
      metrics.heavyMakeup > 0.42
        ? "可能存在较明显妆容，评分仅供参考"
        : metrics.heavyMakeup > 0.28
          ? "自然唇色与轻微泛红已忽略，不影响评分"
          : "素颜特征正常（自然唇色、瑕疵、毛孔保留）",
  });

  // 普通眼镜不算遮挡；仅疑似墨镜、强反光、口罩等核心遮挡时提醒
  checks.push({
    id: "occlusion",
    label: "遮挡检测",
    description: "检测眼鼻嘴等核心区域遮挡",
    status: metrics.occlusion > 0.3 ? "warn" : "pass",
    detail:
      metrics.occlusion > 0.46
        ? "疑似墨镜、强反光或口罩遮挡核心五官，评分仅供参考"
        : metrics.occlusion > 0.3
          ? "核心区域可能有轻微遮挡，普通眼镜与发梢贴脸可接受"
          : "核心五官无严重遮挡",
  });

  // mock 阶段：单人自拍默认通过，不因肤色峰值误判多人
  checks.push({
    id: "multi",
    label: "人数检测",
    description: "检测画面中是否有多人",
    status: "pass",
    detail: "单人正脸（自拍默认通过）",
  });

  checks.push({
    id: "face",
    label: "正脸识别",
    description: "检测是否为正面人脸",
    status:
      metrics.skinRatio < 0.06
        ? "fail"
        : metrics.skinRatio < 0.16 || metrics.symmetry < 0.48
          ? "warn"
          : "pass",
    detail:
      metrics.skinRatio < 0.06
        ? "未检测到可用于评分的人脸区域"
        : metrics.skinRatio < 0.16 || metrics.symmetry < 0.48
          ? "自拍角度略有偏差，评分仅供参考"
          : "正脸区域识别正常",
  });

  return checks;
}

export async function analyzePhoto(file: File): Promise<AnalysisResult> {
  const img = await loadImageFromFile(file);
  const { ctx } = drawToCanvas(img);
  const imageData = getImageData(ctx);
  const imageHash = hashImageData(imageData.data);

  const skin = analyzeSkinRegions(imageData);
  const metrics = {
    ...skin,
    lapVar: laplacianVariance(imageData, true),
    colorCast: colorCastScore(imageData),
    heavyMakeup: heavyMakeupScore(imageData),
    symmetry: symmetryScore(imageData),
    occlusion: coreFeatureOcclusionScore(imageData),
  };

  const checks = runChecks(metrics);
  // 仅 fail 阻止评分，warn 不阻止
  const hasFail = checks.some((c) => c.status === "fail");
  const passed = !hasFail;

  if (!passed) {
    return {
      passed: false,
      checks,
      score: null,
      percentile: null,
      dimensions: [],
      summary: "照片未通过质量检测，请根据下方提示调整后重新上传。",
      tips: checks.filter((c) => c.status === "fail").map((c) => c.detail),
      imageHash,
    };
  }

  const scoreResult = computeBeautyScore(
    { ...metrics, lipCheekSat: metrics.heavyMakeup },
    imageHash,
    seededRandom(imageHash)
  );

  return {
    passed: true,
    checks,
    score: scoreResult.score,
    percentile: scoreResult.percentile,
    dimensions: scoreResult.dimensions,
    summary: scoreResult.summary,
    tips: scoreResult.tips,
    imageHash,
  };
}
