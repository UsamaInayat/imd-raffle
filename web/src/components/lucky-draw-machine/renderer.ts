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

function shadeHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
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

function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  ball: Ball,
  r: number,
) {
  if (ball.depth < 0.45) return;
  ctx.save();
  ctx.translate(ball.x, ball.y + r * 0.72);
  ctx.scale(1, 0.38);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = C.contactShadow;
  ctx.globalAlpha = (ball.depth - 0.45) * 0.55;
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
  const depth = effectiveDepth(ball);
  const scale = depthScale(depth);
  const r = ball.radius * scale;
  const alpha =
    ball.phase === "falling"
      ? fallingAlpha(ball)
      : isOverlayBall(ball)
        ? Math.max(0.92, V.alphaMin + depth * (V.alphaMax - V.alphaMin))
        : V.alphaMin + depth * (V.alphaMax - V.alphaMin);
  const light = isLightFill(ball.fill);
  const gloss = light ? 0.55 : 0.88;

  drawContactShadow(ctx, ball, r);

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.globalAlpha = alpha;

  // Ambient occlusion — dark rim on underside
  const ao = ctx.createRadialGradient(0, r * 0.35, r * 0.1, 0, 0, r);
  ao.addColorStop(0, "rgba(0,0,0,0)");
  ao.addColorStop(0.72, "rgba(0,0,0,0)");
  ao.addColorStop(1, `rgba(0,0,0,${light ? 0.14 : 0.28})`);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = ao;
  ctx.fill();

  // Base albedo + form shading
  const body = ctx.createRadialGradient(
    -r * 0.34,
    -r * 0.38,
    r * 0.04,
    r * 0.06,
    r * 0.14,
    r * 1.05,
  );
  body.addColorStop(0, shadeHex(ball.fill, light ? 22 : 48));
  body.addColorStop(0.38, ball.fill);
  body.addColorStop(0.78, shadeHex(ball.fill, light ? -18 : -32));
  body.addColorStop(1, shadeHex(ball.fill, light ? -38 : -55));
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  // Primary specular (key light upper-left)
  const spec = ctx.createRadialGradient(
    -r * 0.42,
    -r * 0.48,
    0,
    -r * 0.42,
    -r * 0.48,
    r * 0.55 * gloss,
  );
  spec.addColorStop(0, `rgba(255,255,255,${0.55 * gloss})`);
  spec.addColorStop(0.35, `rgba(255,255,255,${0.18 * gloss})`);
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = spec;
  ctx.fill();

  // Secondary catch light lower-right
  const catchL = ctx.createRadialGradient(
    r * 0.38,
    r * 0.28,
    0,
    r * 0.38,
    r * 0.28,
    r * 0.35,
  );
  catchL.addColorStop(0, `rgba(255,255,255,${0.12 * gloss})`);
  catchL.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = catchL;
  ctx.fill();

  // Micro edge definition
  ctx.strokeStyle = `rgba(0,0,0,${0.08 + ball.depth * 0.18})`;
  ctx.lineWidth = 0.45 + ball.depth * 0.25;
  ctx.stroke();

  // Embossed number
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

    ctx.fillStyle = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)";
    ctx.globalAlpha = alpha * (0.25 + boost * 0.35);
    ctx.fillText(num, 0.35, 0.65);

    ctx.fillStyle = light ? C.numberDark : C.numberLight;
    ctx.globalAlpha = alpha * (0.42 + boost * 0.58);
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

/** Glass shell — visible rim & highlights only; interior stays fully clear. */
function drawGlassShell(ctx: CanvasRenderingContext2D) {
  const drum = getDrumGeometry();
  const { cx, cy, radius } = drum;

  ctx.save();

  // Fresnel brightening confined to the rim band — never fills the interior
  const rimBand = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.arc(cx, cy, radius - rimBand, 0, Math.PI * 2, true);
  const fresnel = ctx.createRadialGradient(
    cx,
    cy,
    radius - rimBand,
    cx,
    cy,
    radius,
  );
  fresnel.addColorStop(0, "rgba(255,255,255,0.04)");
  fresnel.addColorStop(0.55, C.glassFresnel);
  fresnel.addColorStop(1, "rgba(255,255,255,0.28)");
  ctx.fillStyle = fresnel;
  ctx.fill("evenodd");

  // Inner glass wall — thin bright inner edge (stroke only)
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3.2, 0, Math.PI * 2);
  ctx.strokeStyle = C.glassInner;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.62;
  ctx.stroke();

  // Outer rim — clearly visible boundary
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = C.glassOuter;
  ctx.lineWidth = 1.65;
  ctx.stroke();

  // Primary studio highlight — upper-left arc
  ctx.beginPath();
  ctx.arc(
    cx - radius * 0.36,
    cy - radius * 0.5,
    radius * 0.13,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = C.glassHighlight;
  ctx.lineWidth = 2.1;
  ctx.globalAlpha = 0.78;
  ctx.stroke();

  // Secondary sheen — mid-right
  ctx.beginPath();
  ctx.arc(
    cx + radius * 0.44,
    cy - radius * 0.08,
    radius * 0.055,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = C.glassHighlight2;
  ctx.lineWidth = 1.1;
  ctx.globalAlpha = 0.5;
  ctx.stroke();

  ctx.globalAlpha = 1;
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
