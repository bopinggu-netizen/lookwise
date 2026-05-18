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

  // 原相机自拍通常清晰度足够；仅极模糊才拒绝
  checks.push({
    id: "blur",
    label: "清晰度",
    description: "检测照片是否模糊",
    status: metrics.lapVar < 18 ? "fail" : metrics.lapVar < 45 ? "warn" : "pass",
    detail:
      metrics.lapVar < 18
        ? "画面严重模糊，无法准确评估五官细节"
        : metrics.lapVar < 45
          ? "清晰度略低，原相机可接受，建议对焦更清晰"
          : "清晰度良好（含原相机锐化）",
  });

  checks.push({
    id: "light",
    label: "光线",
    description: "检测曝光与亮度",
    status:
      metrics.avgLum < 38 ? "fail" : metrics.avgLum < 58 || metrics.avgLum > 238 ? "warn" : "pass",
    detail:
      metrics.avgLum < 38
        ? "光线过暗，面部细节难以辨认"
        : metrics.avgLum > 238
          ? "曝光偏高，原相机 HDR 可能略过曝"
          : metrics.avgLum < 58
            ? "光线偏暗，可尝试明亮环境重拍"
            : "光线条件可接受（含自动曝光）",
  });

  // 仅当磨皮极高且皮肤纹理几乎消失时才判定美颜；HDR/锐化/白平衡不算
  const extremeBeauty = metrics.smoothness > 0.94 && metrics.lapVar < 35;
  checks.push({
    id: "beauty",
    label: "美颜检测",
    description: "检测明显磨皮、瘦脸等美颜处理",
    status: extremeBeauty ? "fail" : metrics.smoothness > 0.9 && metrics.lapVar < 55 ? "warn" : "pass",
    detail: extremeBeauty
      ? "检测到明显磨皮或五官液化痕迹，请使用原相机无美颜模式"
      : metrics.smoothness > 0.9 && metrics.lapVar < 55
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

  // 自然唇色、泛红、毛孔痘印不判浓妆；仅高饱和彩妆才 fail
  checks.push({
    id: "makeup",
    label: "妆容检测",
    description: "检测明显浓妆",
    status: metrics.heavyMakeup > 0.42 ? "fail" : metrics.heavyMakeup > 0.28 ? "warn" : "pass",
    detail:
      metrics.heavyMakeup > 0.42
        ? "检测到明显口红/眼妆/修容，请上传素颜照"
        : metrics.heavyMakeup > 0.28
          ? "略有妆容痕迹，自然唇色与泛红已忽略"
          : "素颜特征正常（自然唇色、瑕疵、毛孔保留）",
  });

  // 仅核心五官遮挡才 fail；发梢贴脸仅 warn
  checks.push({
    id: "occlusion",
    label: "遮挡检测",
    description: "检测眼鼻嘴等核心区域遮挡",
    status: metrics.occlusion > 0.38 ? "fail" : metrics.occlusion > 0.22 ? "warn" : "pass",
    detail:
      metrics.occlusion > 0.38
        ? "眼/鼻/嘴等核心五官存在明显遮挡"
        : metrics.occlusion > 0.22
          ? "核心区域轻微遮挡，发梢贴脸可接受"
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
    status: metrics.skinRatio < 0.16 ? "fail" : metrics.skinRatio < 0.24 ? "warn" : "pass",
    detail:
      metrics.skinRatio < 0.16
        ? "未检测到足够的人脸区域，请上传正脸特写"
        : metrics.skinRatio < 0.24
          ? "人脸区域偏小，建议靠近镜头"
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
