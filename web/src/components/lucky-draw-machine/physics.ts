import { BOWL_CONFIG } from "./config";
import type { Ball, BowlGeometry } from "./types";

const P = BOWL_CONFIG.physics;

export function getBowlGeometry(): BowlGeometry {
  const { cx, cy, rx, ry } = BOWL_CONFIG.bowl;
  const holeR = BOWL_CONFIG.hole.radius;
  return {
    cx,
    cy,
    rx,
    ry,
    holeX: cx,
    holeY: cy + ry - holeR * 0.35,
    holeR,
  };
}

function randomSpawn(): { x: number; y: number; vx: number; vy: number } {
  const { cx, cy, rx, ry } = BOWL_CONFIG.bowl;
  const r = BOWL_CONFIG.ballRadius;
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * 0.72;
    const x = cx + Math.cos(angle) * rx * dist;
    const y = cy - ry * 0.15 + Math.sin(angle) * ry * dist * 0.85;
    if (isInsideBowl(x, y, r)) {
      return {
        x,
        y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.4,
      };
    }
  }
  return { x: cx, y: cy - ry * 0.3, vx: 0, vy: 0 };
}

export function createBalls(): Ball[] {
  const tones = BOWL_CONFIG.ballTones;
  const balls: Ball[] = [];

  for (let i = 0; i < BOWL_CONFIG.ballCount; i++) {
    const spawn = randomSpawn();
    balls.push({
      id: i,
      number: i + 1,
      ...spawn,
      radius: BOWL_CONFIG.ballRadius,
      fill: tones[i % tones.length] ?? "#ccc",
      phase: "inside",
      exitAfter: 0,
    });
  }

  return balls;
}

export function isInsideBowl(x: number, y: number, inset = 0): boolean {
  const { cx, cy, rx, ry } = BOWL_CONFIG.bowl;
  const nx = (x - cx) / (rx - inset);
  const ny = (y - cy) / (ry - inset);
  return nx * nx + ny * ny <= 1;
}

function bowlNormal(x: number, y: number): { nx: number; ny: number } {
  const { cx, cy, rx, ry } = BOWL_CONFIG.bowl;
  const dx = (x - cx) / (rx * rx);
  const dy = (y - cy) / (ry * ry);
  const len = Math.hypot(dx, dy) || 1;
  return { nx: dx / len, ny: dy / len };
}

function inHoleZone(ball: Ball, bowl: BowlGeometry): boolean {
  const dx = Math.abs(ball.x - bowl.holeX);
  const nearBottom = ball.y > bowl.cy + bowl.ry - ball.radius * 3.2;
  return nearBottom && dx < bowl.holeR * 1.05;
}

function resolveBowlWall(ball: Ball, bowl: BowlGeometry) {
  if (ball.phase !== "inside") return;

  const { cx, cy, rx, ry } = bowl;
  const margin = ball.radius * 0.92;
  const nx = (ball.x - cx) / (rx - margin);
  const ny = (ball.y - cy) / (ry - margin);
  const d = nx * nx + ny * ny;

  if (d <= 1) return;

  const { nx: nnx, ny: nny } = bowlNormal(ball.x, ball.y);
  const dist = Math.hypot((ball.x - cx) / rx, (ball.y - cy) / ry);
  const pen = dist - 1 + margin / Math.min(rx, ry);
  ball.x -= nnx * pen * Math.min(rx, ry);
  ball.y -= nny * pen * Math.min(rx, ry);

  const vDot = ball.vx * nnx + ball.vy * nny;
  if (vDot > 0) {
    ball.vx -= (1 + P.wallRestitution) * vDot * nnx;
    ball.vy -= (1 + P.wallRestitution) * vDot * nny;
  }
}

function resolveBallPair(a: Ball, b: Ball) {
  if (a.phase === "recycling" || b.phase === "recycling") return;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;
  if (dist >= minDist || dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const rel = dvx * nx + dvy * ny;
  if (rel <= 0) return;

  const impulse = ((1 + P.ballRestitution) * rel) / 2;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
}

function clampSpeed(ball: Ball) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > P.maxSpeed) {
    ball.vx = (ball.vx / speed) * P.maxSpeed;
    ball.vy = (ball.vy / speed) * P.maxSpeed;
  }
}

function tryExit(ball: Ball, bowl: BowlGeometry, now: number) {
  if (ball.phase !== "inside" || now < ball.exitAfter) return;
  if (!inHoleZone(ball, bowl)) return;

  const dx = Math.abs(ball.x - bowl.holeX);
  if (dx > bowl.holeR * 0.7) return;
  if (ball.vy < -0.15) return;

  const speed = Math.hypot(ball.vx, ball.vy);
  const aligned = dx < bowl.holeR * 0.45;
  const settling = speed < 0.5 && ball.y > bowl.cy + bowl.ry - ball.radius * 4;
  const dropping = ball.vy > 0.08;

  if (!aligned && !settling && !dropping) return;

  ball.phase = "falling";
  ball.vx *= 0.25;
  ball.vy = Math.max(ball.vy, 0.55);
}

function recycleBall(ball: Ball, now: number) {
  const spawn = randomSpawn();
  ball.x = spawn.x;
  ball.y = spawn.y;
  ball.vx = spawn.vx;
  ball.vy = spawn.vy;
  ball.phase = "inside";
  ball.exitAfter = now + P.respawnCooldown;
}

export function stepSimulation(
  balls: Ball[],
  dt: number,
  now: number,
  reducedMotion: boolean,
) {
  if (reducedMotion) return;

  const bowl = getBowlGeometry();
  const dtScale = dt / 16.67;

  for (const ball of balls) {
    if (ball.phase === "recycling") continue;

    if (ball.phase === "falling") {
      ball.vy += P.gravity * 1.4 * dtScale;
      ball.x += ball.vx * dtScale;
      ball.y += ball.vy * dtScale;
      ball.vx *= 0.995;

      if (ball.y > BOWL_CONFIG.height + ball.radius * 2) {
        ball.phase = "recycling";
        recycleBall(ball, now);
      }
      continue;
    }

    ball.vy += P.gravity * dtScale;

    if (Math.random() < P.microImpulseChance) {
      ball.vx += (Math.random() - 0.5) * P.microImpulseStrength;
      ball.vy += (Math.random() - 0.5) * P.microImpulseStrength * 0.5;
    }

    ball.x += ball.vx * dtScale;
    ball.y += ball.vy * dtScale;
    ball.vx *= P.damping;
    ball.vy *= P.damping;

    if (inHoleZone(ball, bowl)) {
      ball.vy += P.gravity * 0.65 * dtScale;
      ball.vx += (bowl.holeX - ball.x) * 0.002 * dtScale;
    } else {
      resolveBowlWall(ball, bowl);
    }

    tryExit(ball, bowl, now);
    clampSpeed(ball);
  }

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      resolveBallPair(balls[i], balls[j]);
    }
  }
}

export function formatBallNumber(n: number): string {
  return n.toString().padStart(2, "0");
}
