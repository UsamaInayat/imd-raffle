import { BOWL_CONFIG } from "./config";
import { formatBallNumber, getDrumGeometry } from "./physics";
import type { Ball } from "./types";

const C = BOWL_CONFIG.colors;
const V = BOWL_CONFIG.perspective;

function isLightFill(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function depthScale(depth: number): number {
  return V.scaleMin + depth * (V.scaleMax - V.scaleMin);
}

function effectiveDepth(ball: Ball): number {
  const drum = getDrumGeometry();
  if (ball.phase === "falling") return 0.96;
  if (ball.y > drum.cy + drum.radius * 0.38) {
    return Math.max(ball.depth, 0.82);
  }
  return ball.depth;
}

/** Only exiting balls render outside the glass clip. */
function isOverlayBall(ball: Ball): boolean {
  return ball.phase === "falling";
}

function shouldDrawNumber(ball: Ball): boolean {
  if (!BOWL_CONFIG.showNumbers) return false;
  if (ball.phase === "falling") return true;
  return effectiveDepth(ball) > V.numberCutoff;
}

function fallingAlpha(ball: Ball): number {
  const fadeStart = BOWL_CONFIG.height - 90;
  if (ball.y <= fadeStart) return 1;
  return Math.max(0, 1 - (ball.y - fadeStart) / 70);
}

function sortBalls(balls: Ball[]): Ball[] {
  return [...balls].sort((a, b) => a.depth - b.depth);
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
  const depth = effectiveDepth(ball);
  const scale = depthScale(depth);
  const r = ball.radius * scale;
  const alpha =
    ball.phase === "falling"
      ? fallingAlpha(ball)
      : V.alphaMin + depth * (V.alphaMax - V.alphaMin);
  const light = isLightFill(ball.fill);

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = ball.fill;
  ctx.fill();

  ctx.strokeStyle = light ? C.numberDark : C.numberLight;
  ctx.lineWidth = 0.65 + ball.depth * 0.2;
  ctx.stroke();

  if (shouldDrawNumber(ball)) {
    const boost =
      depth > V.numberCutoff
        ? (depth - V.numberCutoff) / (1 - V.numberCutoff)
        : 0.85;
    const fontSize = Math.max(5, r * (0.68 + boost * 0.42));
    const num = formatBallNumber(ball.number);
    ctx.font = `600 ${fontSize}px var(--font-mono), monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = light ? C.numberDark : C.numberLight;
    ctx.globalAlpha = alpha * (0.55 + boost * 0.45);
    ctx.fillText(num, 0, 0.3);
  }

  ctx.restore();
}

/** Clip a single ball to the glass interior so edge balls curve naturally, not flat-cut. */
function drawBallClipped(ctx: CanvasRenderingContext2D, ball: Ball) {
  const drum = getDrumGeometry();
  const scale = depthScale(ball.depth);
  const r = ball.radius * scale;
  const dist = Math.hypot(ball.x - drum.cx, ball.y - drum.cy);

  if (dist + r <= drum.radius - 0.5) {
    drawBall(ctx, ball);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(drum.cx, drum.cy, drum.radius - 0.5, 0, Math.PI * 2);
  ctx.clip();
  drawBall(ctx, ball);
  ctx.restore();
}

/** Glass shell — black outline only. */
function drawGlassShell(ctx: CanvasRenderingContext2D) {
  const drum = getDrumGeometry();
  const { cx, cy, radius } = drum;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3.2, 0, Math.PI * 2);
  ctx.strokeStyle = C.glassInner;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = C.glassOuter;
  ctx.lineWidth = 1.65;
  ctx.stroke();
  ctx.restore();
}

function renderScene(ctx: CanvasRenderingContext2D, balls: Ball[]) {
  const { width, height } = BOWL_CONFIG;
  ctx.clearRect(0, 0, width, height);

  const sorted = sortBalls(balls);
  const overlay = sorted.filter(isOverlayBall);
  const inside = sorted.filter(
    (b) => b.phase === "inside" && !isOverlayBall(b),
  );
  const back = inside.filter((b) => b.depth < 0.52);
  const front = inside.filter((b) => b.depth >= 0.52);

  for (const ball of back) drawBallClipped(ctx, ball);
  for (const ball of front) drawBallClipped(ctx, ball);

  drawGlassShell(ctx);

  for (const ball of overlay) {
    if (ball.phase === "falling" && fallingAlpha(ball) <= 0) continue;
    drawBall(ctx, ball);
  }
}

export function renderDrum(ctx: CanvasRenderingContext2D, balls: Ball[]) {
  renderScene(ctx, balls);
}

export function renderStatic(ctx: CanvasRenderingContext2D, balls: Ball[]) {
  renderScene(ctx, balls);
}
