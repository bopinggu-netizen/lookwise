export interface ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };
    img.src = url;
  });
}

export function drawToCanvas(
  img: HTMLImageElement,
  maxSize = 640
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("无法创建画布");

  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx };
}

export function getImageData(ctx: CanvasRenderingContext2D): ImageData {
  const { width, height, data } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  return { width, height, data };
}

/** 中心椭圆区域（模拟人脸 ROI） */
export function forEachFacePixel(
  img: ImageData,
  fn: (x: number, y: number, i: number, inFace: boolean) => void
): void {
  const cx = img.width / 2;
  const cy = img.height * 0.42;
  const rx = img.width * 0.32;
  const ry = img.height * 0.38;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const inFace = dx * dx + dy * dy <= 1;
      const i = (y * img.width + x) * 4;
      fn(x, y, i, inFace);
    }
  }
}

export function rgbAt(data: Uint8ClampedArray, i: number): [number, number, number] {
  return [data[i], data[i + 1], data[i + 2]];
}

export function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

export function isSkinTone(r: number, g: number, b: number): boolean {
  const y = luminance(r, g, b);
  if (y < 40 || y > 245) return false;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cr >= 133 && cr <= 173 && cb >= 77 && cb <= 127 && r > g && g > b * 0.85;
}

export function hashImageData(data: Uint8ClampedArray): string {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(data.length / 8000));
  for (let i = 0; i < data.length; i += step * 4) {
    h ^= data[i] ^ data[i + 1] ^ data[i + 2];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function seededRandom(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s + seed.charCodeAt(i) * (i + 1)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
