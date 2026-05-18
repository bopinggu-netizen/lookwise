interface Metrics {
  lapVar: number;
  avgLum: number;
  avgSat: number;
  smoothness: number;
  symmetry: number;
  lipCheekSat: number;
  skinRatio: number;
}

interface ScoreOutput {
  score: number;
  percentile: string;
  dimensions: { name: string; score: number; comment: string }[];
  summary: string;
  tips: string[];
}

const SCORE_MIN = 4.0;
const SCORE_MAX = 7.0;
const ADVANTAGE_THRESHOLD = 0.68;
const MILD_ADVANTAGE_THRESHOLD = 0.58;
const WEAK_DIMENSION_THRESHOLD = 0.46;

/** 将原始指标映射到 0–1 */
function normalizeMetrics(m: Metrics) {
  const clarity = Math.min(1, m.lapVar / 200);
  const lighting = 1 - Math.min(1, Math.abs(m.avgLum - 140) / 90);
  const naturalSkin = 1 - m.smoothness * 0.6;
  const symmetry = m.symmetry;
  const harmony = 0.72 * symmetry + 0.16 * proportionFromSkin(m.skinRatio) + 0.12 * lighting;
  const complexion = 0.7 * naturalSkin + 0.3 * (1 - Math.min(1, m.lipCheekSat));
  const proportion = proportionFromSkin(m.skinRatio);

  return { clarity, lighting, naturalSkin, symmetry, harmony, complexion, proportion };
}

/** 4.0–7.0 档位标签 */
export function getScoreTier(score: number): string {
  if (score >= 6.7) return "普通人顶美 / 顶帅";
  if (score >= 6.2) return "普通人高颜值";
  if (score >= 5.7) return "明显好看";
  if (score >= 5.3) return "小美 / 小帅";
  if (score >= 4.9) return "普通偏上";
  return "普通";
}

export function computeBeautyScore(
  metrics: Metrics,
  _seed: string,
  random: () => number
): ScoreOutput {
  const n = normalizeMetrics(metrics);

  const dimensions = [
    {
      name: "五官协调度",
      score: clamp(0.16 + n.harmony * 0.72 + n.proportion * 0.12 + (random() - 0.5) * 0.04, 0.3, 0.9),
      comment:
        n.harmony >= ADVANTAGE_THRESHOLD
          ? "五官关系较协调，是当前照片里比较明确的基础优势。"
          : "五官关系整体偏日常，当前照片没有体现出特别突出的协调优势。",
    },
    {
      name: "眉眼吸引力",
      score: clamp(0.14 + n.symmetry * 0.42 + n.clarity * 0.22 + n.lighting * 0.16 + (random() - 0.5) * 0.04, 0.3, 0.9),
      comment:
        n.symmetry * 0.55 + n.clarity * 0.25 + n.lighting * 0.2 >= ADVANTAGE_THRESHOLD
          ? "眉眼区域有一定吸引力和精神感，对第一眼好感有帮助。"
          : "眉眼吸引力呈现较日常，暂未形成明显局部优势。",
    },
    {
      name: "脸型轮廓",
      score: clamp(0.18 + n.proportion * 0.62 + n.symmetry * 0.18 + (random() - 0.5) * 0.04, 0.3, 0.88),
      comment:
        n.proportion * 0.72 + n.symmetry * 0.28 >= ADVANTAGE_THRESHOLD
          ? "脸型线条相对流畅，轮廓在自拍中有一定加分。"
          : "脸型轮廓属于普通自拍呈现，流畅度优势还不算明显。",
    },
    {
      name: "皮肤与干净感",
      score: clamp(0.12 + n.complexion * 0.58 + n.lighting * 0.2 + n.naturalSkin * 0.08 + (random() - 0.5) * 0.04, 0.3, 0.88),
      comment:
        n.complexion * 0.72 + n.lighting * 0.28 >= ADVANTAGE_THRESHOLD
          ? "皮肤状态和干净感较稳定，是较容易被感知到的优势。"
          : "皮肤与干净感处于自然日常状态，不单独拉高整体分数。",
    },
    {
      name: "异性审美匹配度",
      score: clamp(0.12 + n.harmony * 0.32 + n.proportion * 0.22 + n.complexion * 0.18 + n.symmetry * 0.1 + (random() - 0.5) * 0.04, 0.3, 0.86),
      comment: "仅参考亚洲常见审美偏好中的部分倾向；没有明显优势时不会因为检测通过而抬高分数。",
    },
    {
      name: "自然上镜度",
      score: clamp(0.18 + n.clarity * 0.22 + n.lighting * 0.28 + n.naturalSkin * 0.16 + n.harmony * 0.14 + (random() - 0.5) * 0.04, 0.32, 0.88),
      comment:
        n.clarity * 0.35 + n.lighting * 0.35 + n.harmony * 0.3 >= ADVANTAGE_THRESHOLD
          ? "照片呈现自然，上镜状态对整体观感有一定帮助。"
          : "自然上镜度偏日常，更多作为置信度参考而非高分来源。",
    },
  ];

  const weighted =
    dimensions[0].score * 0.25 +
    dimensions[1].score * 0.2 +
    dimensions[2].score * 0.2 +
    dimensions[3].score * 0.15 +
    dimensions[4].score * 0.1 +
    dimensions[5].score * 0.1;

  const advantageCount = dimensions.filter((d) => d.score >= ADVANTAGE_THRESHOLD).length;
  const mildAdvantageCount = dimensions.filter((d) => d.score >= MILD_ADVANTAGE_THRESHOLD).length;
  const weakDimensionCount = dimensions.filter((d) => d.score < WEAK_DIMENSION_THRESHOLD).length;
  const strongCoreCount = dimensions
    .slice(0, 4)
    .filter((d) => d.score >= ADVANTAGE_THRESHOLD).length;
  const weightedAverage = weighted * 100;

  let raw = SCORE_MIN + clamp((weighted - 0.42) / 0.42, 0, 1) * 3;
  raw += (random() - 0.5) * 0.12;

  raw = Math.min(raw, scoreCapForAdvantages(advantageCount, mildAdvantageCount, weakDimensionCount, weightedAverage));
  if (strongCoreCount < 1) raw = Math.min(raw, 5.0);
  if (strongCoreCount < 2) raw = Math.min(raw, 5.3);
  if (strongCoreCount < 3) raw = Math.min(raw, 5.6);

  raw = Math.max(raw, scoreFloorForOrdinarySpread(weightedAverage, mildAdvantageCount, weakDimensionCount));

  const score = Math.round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, raw)) * 10) / 10;

  const tier = getScoreTier(score);
  const summary = buildSummary(score, tier);
  const tips = buildTips(score, n, dimensions, advantageCount);

  return {
    score,
    percentile: tier,
    dimensions: dimensions.map((d) => ({
      ...d,
      score: Math.round(d.score * 100),
    })),
    summary,
    tips,
  };
}

function buildSummary(score: number, tier: string): string {
  if (score >= 6.7) {
    return `综合参考结果为「${tier}」。7.0 已经是普通人真实自拍区间内的极高参考分，不代表与明星、网红或精修图对标。`;
  }
  if (score >= 6.2) {
    return `综合参考结果为「${tier}」。整体观感突出，属于普通人真实自拍场景中较高的参考区间。`;
  }
  if (score >= 5.7) {
    return `综合参考结果为「${tier}」。整体协调度、眉眼、脸型和干净感都较强，第一眼好感比较明显。`;
  }
  if (score >= 5.3) {
    return `综合参考结果为「${tier}」。具备较明确的局部优势，进入小美 / 小帅低段。`;
  }
  if (score >= 4.9) {
    return `综合参考结果为「${tier}」。有一定局部优势，属于普通偏上参考。`;
  }
  if (score >= 4.6) {
    return `综合参考结果为「${tier}」。整体仍属于普通区间，但有一些自然优势。`;
  }
  if (score >= 4.3) {
    return `综合参考结果为「${tier}」。整体属于普通区间，五官基础较日常自然。`;
  }
  return `综合参考结果为「${tier}」。整体处于普通区间下沿，当前照片没有体现出明显上镜优势。`;
}

function buildTips(
  score: number,
  n: ReturnType<typeof normalizeMetrics>,
  dims: { name: string; score: number }[],
  advantageCount: number
): string[] {
  const tips: string[] = [];

  if (advantageCount < 2) {
    tips.push("5.0 以上需要至少两个核心维度有明显优势；当前结果更接近日常自拍参考。");
  }
  if (n.symmetry < 0.7) tips.push("轻微调整拍摄角度，让两侧脸部和眉眼区域更均衡。");

  const lowest = [...dims].sort((a, b) => a.score - b.score)[0];
  if (lowest.score < 0.62) {
    tips.push(`当前「${lowest.name}」还没有形成明显优势，因此会限制整体分数上限。`);
  }

  if (score < 6.0) {
    tips.push("检测通过只代表照片可用于评分，不会自动进入 5 分以上区间。");
  }

  if (tips.length === 0) {
    tips.push("保持当前自然状态与拍摄方式即可，真实感是重要加分项。");
  }

  return tips.slice(0, 4);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function proportionFromSkin(skinRatio: number): number {
  return clamp(1 - Math.abs(skinRatio - 0.36) / 0.34, 0.28, 0.82);
}

function scoreCapForAdvantages(
  advantageCount: number,
  mildAdvantageCount: number,
  weakDimensionCount: number,
  weightedAverage: number
): number {
  if (advantageCount <= 0) {
    if (mildAdvantageCount >= 3 && weakDimensionCount <= 1 && weightedAverage >= 58) return 4.8;
    if (mildAdvantageCount >= 2 && weakDimensionCount <= 1 && weightedAverage >= 52) return 4.6;
    return 4.4;
  }
  if (advantageCount === 1) {
    return mildAdvantageCount >= 3 && weakDimensionCount <= 1 ? 5.0 : 4.8;
  }
  if (advantageCount === 2) return 5.3;
  if (advantageCount === 3) return 5.6;
  return SCORE_MAX;
}

function scoreFloorForOrdinarySpread(
  weightedAverage: number,
  mildAdvantageCount: number,
  weakDimensionCount: number
): number {
  let floor = SCORE_MIN;
  if (weightedAverage >= 45) floor = 4.2;
  if (weightedAverage >= 52) floor = 4.4;
  if (weightedAverage >= 58) floor = 4.6;
  if (mildAdvantageCount >= 2 && weakDimensionCount <= 1) floor = Math.max(floor, 4.4);
  if (mildAdvantageCount >= 3 && weightedAverage >= 56 && weakDimensionCount <= 1) {
    floor = Math.max(floor, 4.6);
  }
  return floor;
}
