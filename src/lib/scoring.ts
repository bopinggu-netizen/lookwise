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

/** 将原始指标映射到 0–1 */
function normalizeMetrics(m: Metrics) {
  const clarity = Math.min(1, m.lapVar / 200);
  const lighting = 1 - Math.min(1, Math.abs(m.avgLum - 140) / 90);
  const naturalSkin = 1 - m.smoothness * 0.6;
  const symmetry = m.symmetry;
  const harmony = 0.55 * symmetry + 0.25 * clarity + 0.2 * lighting;
  const complexion = 0.7 * naturalSkin + 0.3 * (1 - Math.min(1, m.lipCheekSat));
  const proportion = 0.5 + m.skinRatio * 0.5;

  return { clarity, lighting, naturalSkin, symmetry, harmony, complexion, proportion };
}

/** 4.0–7.0 档位标签 */
export function getScoreTier(score: number): string {
  if (score >= 7.0) return "普通人顶美 / 顶帅";
  if (score >= 6.5) return "普通人高颜值";
  if (score >= 6.0) return "班花 / 班草 / 校花校草";
  if (score >= 5.5) return "明显好看";
  if (score >= 5.0) return "小美 / 小帅";
  if (score >= 4.5) return "普通偏上";
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
      name: "五官协调",
      score: clamp(n.harmony + (random() - 0.5) * 0.08, 0.35, 0.88),
      comment: n.symmetry > 0.75 ? "左右对称度较好，整体比例自然" : "五官比例尚可，轻微角度变化会影响当前照片观感",
    },
    {
      name: "肤质气色",
      score: clamp(n.complexion + (random() - 0.5) * 0.06, 0.35, 0.85),
      comment: n.naturalSkin > 0.5 ? "肤色自然，气色较为干净通透" : "肤质纹理保留，真实感较好",
    },
    {
      name: "轮廓线条",
      score: clamp(n.proportion * 0.85 + n.symmetry * 0.15 + (random() - 0.5) * 0.07, 0.38, 0.86),
      comment: "脸型线条自然，参考亚洲常见审美偏好中的清爽轮廓倾向",
    },
    {
      name: "神采亲和力",
      score: clamp(n.lighting * 0.6 + n.clarity * 0.4 + (random() - 0.5) * 0.08, 0.4, 0.88),
      comment: n.lighting > 0.65 ? "光线衬托眉眼与表情，更有自然亲和感" : "建议适当提亮环境光以展现眉眼神采",
    },
  ];

  const weighted =
    dimensions[0].score * 0.3 +
    dimensions[1].score * 0.25 +
    dimensions[2].score * 0.25 +
    dimensions[3].score * 0.2;

  // 将多数结果压在 4.5–6.2，6.5+ 较少，7.0 极少
  let normalizedScore = clamp(weighted * 0.68 + 0.06, 0, 1);
  if (normalizedScore > 0.72) {
    normalizedScore = 0.72 + (normalizedScore - 0.72) * 0.38;
  }

  let raw = SCORE_MIN + normalizedScore * 3;
  const jitter = (random() - 0.5) * 0.28;
  raw += jitter;

  // 7.0 仅极少数：需较高基础分且随机闸门
  if (raw > 6.75 && random() < 0.88) {
    raw = 6.45 + (raw - 6.45) * 0.55;
  }

  const score = Math.round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, raw)) * 10) / 10;

  const tier = getScoreTier(score);
  const summary = buildSummary(score, tier);
  const tips = buildTips(score, n, dimensions);

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
  if (score >= 7.0) {
    return `综合参考结果为「${tier}」。在普通人真实自拍场景中属于极高参考区间，仍仅代表这张照片的自然观感。`;
  }
  if (score >= 6.5) {
    return `综合参考结果为「${tier}」。整体观感突出，在日常生活场景中属于很有吸引力的类型。`;
  }
  if (score >= 6.0) {
    return `综合参考结果为「${tier}」。在常见生活场景中辨识度较高，若干维度表现亮眼。`;
  }
  if (score >= 5.5) {
    return `综合参考结果为「${tier}」。第一眼好感度较好，真实素颜状态有加分。`;
  }
  if (score >= 5.0) {
    return `综合参考结果为「${tier}」。具备一定吸引力，符合日常审美中清秀、干净、耐看的倾向。`;
  }
  if (score >= 4.5) {
    return `综合参考结果为「${tier}」。整体处于普通人常见区间，真实自然的状态本身就是加分项。`;
  }
  return `综合参考结果为「${tier}」。建议优化拍摄角度与光线后再次评估，评分基于当前照片条件。`;
}

function buildTips(
  score: number,
  n: ReturnType<typeof normalizeMetrics>,
  dims: { name: string; score: number }[]
): string[] {
  const tips: string[] = [];

  if (n.lighting < 0.6) tips.push("在自然光窗边拍摄，避免顶光与背光。");
  if (n.clarity < 0.5) tips.push("保持手机稳定，确保对焦清晰。");
  if (n.symmetry < 0.7) tips.push("正对镜头，眼睛平视，减少侧脸角度。");

  const lowest = [...dims].sort((a, b) => a.score - b.score)[0];
  if (lowest.score < 0.55) {
    tips.push(`可重点提升「${lowest.name}」：保持规律作息与适度护肤。`);
  }

  if (score < 6.0) {
    tips.push("日常自拍中自然、自信的神态往往比过度修饰更重要。");
  }

  if (tips.length === 0) {
    tips.push("保持当前素颜状态与拍摄方式即可，真实感是最好的加分项。");
  }

  return tips.slice(0, 4);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
