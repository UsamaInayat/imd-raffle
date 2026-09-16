import { MACHINE_CONFIG } from "./config";
import { formatBallNumber } from "./physics";
import type { Ball, DrawState, MachineSnapshot } from "./types";

const C = MACHINE_CONFIG.colors;
const { chamber, agitator, funnel, output, base } = MACHINE_CONFIG;

function drawShadow(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = C.shadow;
  ctx.beginPath();
  ctx.ellipse(chamber.cx, base.top + 8, 148, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBase(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, base.top, 0, base.bottom);
  grad.addColorStop(0, C.metalMid);
  grad.addColorStop(0.4, C.metalDark);
  grad.addColorStop(1, "#111");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(base.left, base.top);
  ctx.lineTo(base.right, base.top);
  ctx.lineTo(base.right - 18, base.bottom);
  ctx.lineTo(base.left + 18, base.bottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = C.brassHighlight;
  ctx.fillRect(base.left + 40, base.top - 4, base.right - base.left - 80, 6);

  ctx.fillStyle = C.metalLight;
  ctx.font = "9px var(--font-geist-mono), monospace";
  ctx.textAlign = "center";
  ctx.fillText("IDENTITY DRAW", chamber.cx, base.top + 52);
}

function drawOutputChannel(ctx: CanvasRenderingContext2D, gateOpen: number) {
  const { start, end, tubeRadius } = output;

  ctx.save();
  ctx.lineCap = "round";

  const tubeGrad = ctx.createLinearGradient(start.x, start.y - tubeRadius, start.x, start.y + tubeRadius);
  tubeGrad.addColorStop(0, C.metalLight);
  tubeGrad.addColorStop(0.5, C.metalDark);
  tubeGrad.addColorStop(1, "#0a0a0a");

  ctx.strokeStyle = tubeGrad;
  ctx.lineWidth = tubeRadius * 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y - tubeRadius + 2);
  ctx.lineTo(end.x + 8, end.y - tubeRadius + 2);
  ctx.moveTo(start.x, start.y + tubeRadius - 2);
  ctx.lineTo(end.x + 8, end.y + tubeRadius - 2);
  ctx.stroke();

  const gateX = start.x - 4;
  const gateAngle = (Math.PI / 2) * gateOpen;
  ctx.save();
  ctx.translate(gateX, start.y);
  ctx.rotate(-gateAngle);
  ctx.fillStyle = C.brass;
  ctx.fillRect(-3, -tubeRadius + 1, 6, tubeRadius * 2 - 2);
  ctx.strokeStyle = C.metalDark;
  ctx.strokeRect(-3, -tubeRadius + 1, 6, tubeRadius * 2 - 2);
  ctx.restore();

  ctx.fillStyle = "#0d0d0d";
  ctx.beginPath();
  ctx.arc(end.x + 10, end.y, tubeRadius - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFunnel(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = C.metalMid;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(funnel.top.x - 16, funnel.top.y);
  ctx.lineTo(funnel.top.x, funnel.top.y + 28);
  ctx.lineTo(funnel.gate.x - 8, funnel.gate.y);
  ctx.stroke();

  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(funnel.top.x + 16, funnel.top.y);
  ctx.lineTo(funnel.top.x, funnel.top.y + 28);
  ctx.lineTo(funnel.gate.x + 8, funnel.gate.y);
  ctx.stroke();
  ctx.restore();
}

function drawAgitator(ctx: CanvasRenderingContext2D, angle: number, active: boolean) {
  const { cx, cy, armLength, width } = agitator;

  ctx.save();
  ctx.fillStyle = C.metalDark;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const armGrad = ctx.createLinearGradient(0, -width / 2, armLength, width / 2);
  armGrad.addColorStop(0, C.brass);
  armGrad.addColorStop(1, C.metalMid);
  ctx.fillStyle = armGrad;
  ctx.fillRect(0, -width / 2, armLength, width);
  ctx.strokeStyle = C.metalDark;
  ctx.strokeRect(0, -width / 2, armLength, width);

  ctx.beginPath();
  ctx.arc(armLength, 0, width * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = active ? C.brassHighlight : C.brass;
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawGlassChamber(ctx: CanvasRenderingContext2D, hover: number) {
  const { cx, cy, rx, ry } = chamber;

  ctx.save();

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${0.06 + hover * 0.04})`;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  const glassGrad = ctx.createRadialGradient(cx - 30, cy - 50, 20, cx, cy, rx);
  glassGrad.addColorStop(0, "rgba(255,255,255,0.22)");
  glassGrad.addColorStop(0.55, C.glassFill);
  glassGrad.addColorStop(1, "rgba(200,200,200,0.08)");
  ctx.fillStyle = glassGrad;
  ctx.fill();

  ctx.strokeStyle = C.glassStroke;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.35, cy - ry * 0.55, rx * 0.22, ry * 0.12, -0.5, 0, Math.PI * 2);
  ctx.strokeStyle = C.glassHighlight;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.65 + hover * 0.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - rx + 8, cy + ry - 4);
  ctx.lineTo(cx + rx - 8, cy + ry - 4);
  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 1;
  ctx.stroke();

  ctx.restore();
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: Ball,
  emphasis: "none" | "selected" | "result",
) {
  const depthScale = 0.88 + ball.depth * 0.14;
  const r = ball.radius * depthScale;

  ctx.save();
  ctx.translate(ball.x, ball.y);

  if (emphasis !== "none") {
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = C.selectedRing;
    ctx.lineWidth = emphasis === "result" ? 2.5 : 1.5;
    ctx.stroke();
  }

  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, lighten(ball.color, 0.35));
  grad.addColorStop(0.55, ball.color);
  grad.addColorStop(1, darken(ball.color, 0.35));

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.32, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fill();

  ctx.fillStyle = C.ballText;
  ctx.font = `700 ${Math.max(7, r * 0.95)}px var(--font-geist-mono), monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = C.ballTextShadow;
  ctx.shadowBlur = 2;
  ctx.fillText(formatBallNumber(ball.number), 0, 0.5);

  ctx.restore();
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 255 * amt);
  const g = Math.min(255, ((n >> 8) & 255) + 255 * amt);
  const b = Math.min(255, (n & 255) + 255 * amt);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) * (1 - amt));
  const g = Math.max(0, ((n >> 8) & 255) * (1 - amt));
  const b = Math.max(0, (n & 255) * (1 - amt));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function renderMachine(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
  snapshot: MachineSnapshot,
) {
  const { width, height } = MACHINE_CONFIG;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = C.background;
  ctx.fillRect(0, 0, width, height);

  drawShadow(ctx);
  drawBase(ctx);
  drawOutputChannel(ctx, snapshot.gateOpen);

  const mixing = snapshot.state === "mixing" || snapshot.state === "selecting";
  const sorted = [...balls].sort((a, b) => a.depth - b.depth);
  const selectedId = snapshot.selectedBallId;
  const drawStates: DrawState[] = [
    "chamberToFunnel",
    "inChannel",
    "gateOpening",
    "output",
    "result",
  ];
  const selectedOnTop = drawStates.includes(snapshot.state);

  for (const ball of sorted) {
    if (ball.kinematic) continue;
    drawBall(ctx, ball, "none");
  }

  drawFunnel(ctx);
  drawAgitator(ctx, snapshot.agitatorAngle, mixing);
  drawGlassChamber(ctx, snapshot.hoverIntensity);

  if (selectedId !== null) {
    const selected = balls.find((b) => b.id === selectedId);
    if (selected) {
      const emphasis =
        snapshot.state === "result" || snapshot.state === "output"
          ? "result"
          : "selected";
      if (selectedOnTop || selected.kinematic) {
        drawBall(ctx, selected, emphasis);
      }
    }
  }

  if (snapshot.selectedNumber !== null && (snapshot.state === "result" || snapshot.state === "output")) {
    drawResultLabel(ctx, snapshot.selectedNumber, snapshot.state);
  }
}

function drawResultLabel(ctx: CanvasRenderingContext2D, num: number, state: DrawState) {
  const { exit } = output;
  ctx.save();
  ctx.font = "11px var(--font-geist-mono), monospace";
  ctx.fillStyle = "#555";
  ctx.textAlign = "left";
  ctx.fillText(state === "result" ? "SELECTED" : "DRAWING…", exit.x - 8, exit.y - 28);

  ctx.font = "700 22px var(--font-geist-mono), monospace";
  ctx.fillStyle = "#000";
  ctx.fillText(formatBallNumber(num), exit.x - 6, exit.y - 10);
  ctx.restore();
}
