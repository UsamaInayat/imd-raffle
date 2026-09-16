import { MACHINE_CONFIG } from "./config";
import type { Ball } from "./types";

const { chamber, physics: P } = MACHINE_CONFIG;

export function formatBallNumber(n: number): string {
  return n.toString().padStart(2, "0");
}

export function createBalls(count: number): Ball[] {
  const balls: Ball[] = [];
  const { cx, cy, rx, ry } = chamber;
  const r = MACHINE_CONFIG.ballRadius;

  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * 0.82;
      x = cx + Math.cos(angle) * rx * dist;
      y = cy + Math.sin(angle) * ry * dist;
      if (isInsideChamber(x, y, r * 0.5)) break;
    }

    balls.push({
      id: i,
      number: i + 1,
      x,
      y,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      radius: r,
      color:
        MACHINE_CONFIG.ballColors[i % MACHINE_CONFIG.ballColors.length] ?? "#666",
      depth: 0.35 + Math.random() * 0.65,
      kinematic: false,
    });
  }

  return balls;
}

export function isInsideChamber(x: number, y: number, inset = 0): boolean {
  const { cx, cy, rx, ry } = chamber;
  const nx = (x - cx) / (rx - inset);
  const ny = (y - cy) / (ry - inset);
  return nx * nx + ny * ny <= 1;
}

function chamberNormal(x: number, y: number): { nx: number; ny: number } {
  const { cx, cy, rx, ry } = chamber;
  const dx = (x - cx) / (rx * rx);
  const dy = (y - cy) / (ry * ry);
  const len = Math.hypot(dx, dy) || 1;
  return { nx: dx / len, ny: dy / len };
}

function resolveEllipseBoundary(ball: Ball) {
  const { cx, cy, rx, ry } = chamber;
  const margin = ball.radius * 0.95;
  const nx = (ball.x - cx) / (rx - margin);
  const ny = (ball.y - cy) / (ry - margin);
  const d = nx * nx + ny * ny;

  if (d <= 1) return;

  const { nx: nnx, ny: nny } = chamberNormal(ball.x, ball.y);
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

export function applyAgitatorForce(
  balls: Ball[],
  angle: number,
  strength: number,
) {
  const { cx, cy, armLength } = MACHINE_CONFIG.agitator;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = cx + cos * armLength;
  const tipY = cy + sin * armLength;

  for (const ball of balls) {
    if (ball.kinematic) continue;
    const dx = ball.x - tipX;
    const dy = ball.y - tipY;
    const dist = Math.hypot(dx, dy);
    if (dist > ball.radius + 18) continue;
    const force = (1 - dist / (ball.radius + 18)) * strength * P.agitatorForce;
    ball.vx += cos * force;
    ball.vy += sin * force;
  }
}

export function stepPhysics(
  balls: Ball[],
  opts: {
    mixing: boolean;
    agitatorAngle: number;
    dt: number;
  },
) {
  const damping = opts.mixing ? P.mixDamping : P.idleDamping;
  const dtScale = opts.dt / 16.67;

  for (const ball of balls) {
    if (ball.kinematic) continue;

    ball.vy += P.gravity * dtScale;

    if (opts.mixing && Math.random() < 0.04) {
      ball.vx += (Math.random() - 0.5) * P.mixImpulse;
      ball.vy += (Math.random() - 0.5) * P.mixImpulse;
    }

    ball.x += ball.vx * dtScale;
    ball.y += ball.vy * dtScale;
    ball.vx *= damping;
    ball.vy *= damping;

    resolveEllipseBoundary(ball);
    clampSpeed(ball);
  }

  if (opts.mixing) {
    applyAgitatorForce(balls, opts.agitatorAngle, 1);
  }

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      if (a.kinematic && b.kinematic) continue;
      resolveBallPair(a, b);
    }
  }
}

export function selectRandomBall(balls: Ball[]): Ball {
  const pool = balls.filter((b) => !b.kinematic);
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? balls[0];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
