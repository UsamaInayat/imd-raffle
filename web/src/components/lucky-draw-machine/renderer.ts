import { BOWL_CONFIG } from "./config";
import { formatBallNumber, getBowlGeometry } from "./physics";
import type { Ball } from "./types";

const C = BOWL_CONFIG.colors;

function isLightFill(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
  const r = ball.radius;

  ctx.save();
  ctx.translate(ball.x, ball.y);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = ball.fill;
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.3, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();

  if (BOWL_CONFIG.showNumbers) {
    const light = isLightFill(ball.fill);
    ctx.fillStyle = light ? C.numberDark : C.numberLight;
    ctx.font = `500 ${Math.max(5.5, r * 0.95)}px var(--font-geist-mono), monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.55;
    ctx.fillText(formatBallNumber(ball.number), 0, 0.3);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawGlass(ctx: CanvasRenderingContext2D) {
  const bowl = getBowlGeometry();
  const { cx, cy, rx, ry, holeX, holeY, holeR } = bowl;

  ctx.save();

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.glassFill;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.glassStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.32, cy - ry * 0.52, rx * 0.18, ry * 0.09, -0.45, 0, Math.PI * 2);
  ctx.strokeStyle = C.glassHighlight;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(holeX, holeY, holeR, 0, Math.PI * 2);
  ctx.fillStyle = C.hole;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

export function renderBowl(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
) {
  const { width, height } = BOWL_CONFIG;
  ctx.clearRect(0, 0, width, height);

  const sorted = [...balls].sort((a, b) => a.y - b.y);
  for (const ball of sorted) {
    if (ball.phase !== "falling") drawBall(ctx, ball);
  }

  drawGlass(ctx);

  for (const ball of sorted) {
    if (ball.phase === "falling") drawBall(ctx, ball);
  }
}

export function renderStatic(ctx: CanvasRenderingContext2D, balls: Ball[]) {
  const { width, height } = BOWL_CONFIG;
  ctx.clearRect(0, 0, width, height);

  const sorted = [...balls].sort((a, b) => a.y - b.y);
  for (const ball of sorted) drawBall(ctx, ball);
  drawGlass(ctx);
}
