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
      name: "五官协调度",
      score: clamp(n.harmony + (random() - 0.5) * 0.07, 0.35, 0.88),
      comment:
        n.symmetry > 0.75
          ? "五官关系较自然，整体比例在当前自拍中呈现协调。"
          : "当前照片角度会影响协调度判断，结果更适合作为轻量参考。",
    },
    {
      name: "脸型轮廓",
      score: clamp(n.proportion * 0.72 + n.symmetry * 0.28 + (random() - 0.5) * 0.06, 0.38, 0.86),
      comment: "参考亚洲常见审美偏好中的倾向，脸型流畅度与轮廓清爽感会影响第一眼观感。",
    },
    {
      name: "眉眼吸引力",
      score: clamp(n.lighting * 0.38 + n.clarity * 0.34 + n.symmetry * 0.28 + (random() - 0.5) * 0.07, 0.38, 0.88),
      comment:
        n.clarity > 0.55
          ? "眉眼区域清晰度较好，更容易呈现精神感和亲和感。"
          : "眉眼细节受清晰度或光线影响，建议用更稳定的自然光自拍复测。",
    },
    {
      name: "皮肤与干净感",
      score: clamp(n.complexion * 0.72 + n.lighting * 0.28 + (random() - 0.5) * 0.06, 0.35, 0.86),
      comment:
        n.naturalSkin > 0.5
          ? "肤色与纹理呈现自然，整体干净感较稳定。"
          : "皮肤纹理保留较真实，自拍光线会影响干净感判断。",
    },
    {
      name: "异性审美匹配度",
      score: clamp(n.harmony * 0.34 + n.complexion * 0.28 + n.lighting * 0.2 + n.proportion * 0.18 + (random() - 0.5) * 0.06, 0.36, 0.86),
      comment: "仅参考亚洲常见审美偏好中的部分倾向，不代表所有男性或女性的真实偏好。",
    },
    {
      name: "自然上镜度",
      score: clamp(n.clarity * 0.38 + n.lighting * 0.34 + n.naturalSkin * 0.28 + (random() - 0.5) * 0.07, 0.4, 0.88),
      comment:
        n.lighting > 0.65
          ? "当前照片的光线和真实感较好，自然上镜度有加分。"
          : "自然上镜度受光线影响较明显，换到柔和自然光下可能更稳定。",
    },
  ];

  const weighted =
    dimensions[0].score * 0.2 +
    dimensions[1].score * 0.16 +
    dimensions[2].score * 0.18 +
    dimensions[3].score * 0.18 +
    dimensions[4].score * 0.14 +
    dimensions[5].score * 0.14;

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
    return `综合参考结果为「${tier}」。7.0 已经是普通人真实自拍区间内的极高参考分，不代表与明星、网红或精修图对标。`;
  }
  if (score >= 6.5) {
    return `综合参考结果为「${tier}」。整体观感突出，属于普通人真实自拍场景中较高的参考区间。`;
  }
  if (score >= 6.0) {
    return `综合参考结果为「${tier}」。协调度、干净感或自然上镜度中有若干维度表现较好。`;
  }
  if (score >= 5.5) {
    return `综合参考结果为「${tier}」。第一眼好感度较好，真实自拍状态下有自然加分。`;
  }
  if (score >= 5.0) {
    return `综合参考结果为「${tier}」。具备一定吸引力，符合日常审美中清爽、自然、耐看的倾向。`;
  }
  if (score >= 4.5) {
    return `综合参考结果为「${tier}」。整体处于普通人常见自拍区间，真实自然的状态本身就是加分项。`;
  }
  return `综合参考结果为「${tier}」。评分主要受当前照片条件影响，可在更柔和的光线下再次参考。`;
}

function buildTips(
  score: number,
  n: ReturnType<typeof normalizeMetrics>,
  dims: { name: string; score: number }[]
): string[] {
  const tips: string[] = [];

  if (n.lighting < 0.6) tips.push("在自然光窗边拍摄，避免顶光与背光。");
  if (n.clarity < 0.5) tips.push("保持手机稳定，确保对焦清晰。");
  if (n.symmetry < 0.7) tips.push("轻微调整拍摄角度，让两侧脸部和眉眼区域更均衡。");

  const lowest = [...dims].sort((a, b) => a.score - b.score)[0];
  if (lowest.score < 0.55) {
    tips.push(`可重点提升「${lowest.name}」：保持规律作息与适度护肤。`);
  }

  if (score < 6.0) {
    tips.push("日常自拍中自然、放松的状态往往比过度修饰更耐看。");
  }

  if (tips.length === 0) {
    tips.push("保持当前自然状态与拍摄方式即可，真实感是重要加分项。");
  }

  return tips.slice(0, 4);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
