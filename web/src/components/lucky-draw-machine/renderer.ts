import { BOWL_CONFIG } from "./config";
import { formatBallNumber, getDrumGeometry } from "./physics";
import type { Ball } from "./types";

const C = BOWL_CONFIG.colors;
const M = BOWL_CONFIG.mixer;

function isLightFill(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function sortBalls(balls: Ball[]): Ball[] {
  return [...balls].sort((a, b) => a.y + a.depth * 0.001 - (b.y + b.depth * 0.001));
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, dimBack = false) {
  const depthScale = 0.88 + ball.depth * 0.14;
  const r = ball.radius * depthScale;

  ctx.save();
  ctx.translate(ball.x, ball.y);

  if (dimBack) {
    ctx.globalAlpha = 0.72 + ball.depth * 0.2;
  }

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = ball.fill;
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.32)";
  ctx.lineWidth = 0.75;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.32, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(r * 0.22, r * 0.28, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fill();

  if (BOWL_CONFIG.showNumbers) {
    const light = isLightFill(ball.fill);
    ctx.fillStyle = light ? C.numberDark : C.numberLight;
    ctx.font = `500 ${Math.max(5, r * 0.9)}px var(--font-mono), monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = (dimBack ? 0.45 : 0.5) + ball.depth * 0.08;
    ctx.fillText(formatBallNumber(ball.number), 0, 0.35);
  }

  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D) {
  const drum = getDrumGeometry();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    drum.cx,
    drum.cy + drum.ry + 18,
    drum.rx * 0.55,
    10,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = C.shadow;
  ctx.fill();
  ctx.restore();
}

function drawDrumInterior(ctx: CanvasRenderingContext2D) {
  const drum = getDrumGeometry();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(drum.cx, drum.cy, drum.rx, drum.ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.glassFill;
  ctx.fill();
  ctx.restore();
}

function drawMixer(ctx: CanvasRenderingContext2D, angle: number) {
  const drum = getDrumGeometry();
  const armLen = drum.rx * M.armLengthRatio;
  const shaftTop = drum.cy - drum.ry * M.shaftTopOffset;
  const shaftBottom = drum.cy + drum.ry * M.shaftBottomOffset;
  const cx = drum.cx;

  ctx.save();
  ctx.strokeStyle = C.mixer;
  ctx.lineWidth = M.armStroke;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(cx, shaftTop);
  ctx.lineTo(cx, shaftBottom);
  ctx.stroke();

  for (const armAngle of [angle, angle + Math.PI]) {
    const tipX = cx + Math.cos(armAngle) * armLen;
    const tipY = drum.cy + Math.sin(armAngle) * armLen * 0.62;

    ctx.strokeStyle = C.mixerArm;
    ctx.lineWidth = M.armStroke;
    ctx.beginPath();
    ctx.moveTo(cx, drum.cy - drum.ry * 0.05);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = C.mixerArm;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawOutlet(ctx: CanvasRenderingContext2D) {
  const drum = getDrumGeometry();
  const { holeX, holeY, holeR } = drum;

  ctx.save();

  ctx.beginPath();
  ctx.arc(holeX, holeY, holeR * 1.15, 0, Math.PI * 2);
  ctx.strokeStyle = C.outletRing;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(holeX, holeY, holeR * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = C.outletInner;
  ctx.fill();

  ctx.restore();
}

function drawGlassShell(ctx: CanvasRenderingContext2D) {
  const drum = getDrumGeometry();
  const { cx, cy, rx, ry } = drum;

  ctx.save();

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 1.5, ry - 1.5, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.glassInnerStroke;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.glassStroke;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    cx - rx * 0.34,
    cy - ry * 0.54,
    rx * 0.2,
    ry * 0.08,
    -0.42,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = C.glassHighlight;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.65;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    cx + rx * 0.38,
    cy - ry * 0.08,
    rx * 0.08,
    ry * 0.22,
    0.15,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = C.glassSheen;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.4;
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

export function renderDrum(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
  mixerAngle: number,
) {
  const { width, height } = BOWL_CONFIG;
  ctx.clearRect(0, 0, width, height);

  const sorted = sortBalls(balls);
  const back = sorted.filter((b) => b.depth < 0.5 && b.phase !== "falling");
  const front = sorted.filter((b) => b.depth >= 0.5 && b.phase !== "falling");
  const falling = sorted.filter((b) => b.phase === "falling");

  drawShadow(ctx);
  drawDrumInterior(ctx);

  for (const ball of back) drawBall(ctx, ball, true);
  drawMixer(ctx, mixerAngle);
  for (const ball of front) drawBall(ctx, ball, false);
  drawOutlet(ctx);

  for (const ball of falling) drawBall(ctx, ball, false);

  drawGlassShell(ctx);
}

export function renderStatic(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
  mixerAngle: number,
) {
  const { width, height } = BOWL_CONFIG;
  ctx.clearRect(0, 0, width, height);

  const sorted = sortBalls(balls);
  drawShadow(ctx);
  drawDrumInterior(ctx);
  for (const ball of sorted) drawBall(ctx, ball, ball.depth < 0.5);
  drawMixer(ctx, mixerAngle);
  drawOutlet(ctx);
  drawGlassShell(ctx);
}
