import { BOWL_CONFIG, randomExitInterval } from "./config";
import type { Ball, DrumGeometry, SimulationState } from "./types";

const P = BOWL_CONFIG.physics;
const M = BOWL_CONFIG.mixer;

export function getDrumGeometry(): DrumGeometry {
  const { cx, cy, rx, ry } = BOWL_CONFIG.drum;
  const holeR = BOWL_CONFIG.hole.radius;
  return {
    cx,
    cy,
    rx,
    ry,
    holeX: cx,
    holeY: cy + ry - holeR * 0.25,
    holeR,
  };
}

export function createSimulationState(now: number): SimulationState {
  return {
    mixerAngle: Math.random() * Math.PI * 2,
    nextExitAt: now + randomExitInterval() * 0.4,
    exitLocked: false,
  };
}

function randomBallRadius(): number {
  const { min, max, default: mean } = BOWL_CONFIG.ballRadius;
  const u = Math.random();
  return min + (max - min) * (0.35 + u * u * 0.65) * (mean / ((min + max) / 2));
}

function randomSpawn(): { x: number; y: number; vx: number; vy: number } {
  const { cx, cy, rx, ry } = BOWL_CONFIG.drum;
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * 0.68;
    const x = cx + Math.cos(angle) * rx * dist;
    const y = cy - ry * 0.12 + Math.sin(angle) * ry * dist * 0.82;
    if (isInsideDrum(x, y, BOWL_CONFIG.ballRadius.default)) {
      return {
        x,
        y,
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.35,
      };
    }
  }
  return {
    x: cx + (Math.random() - 0.5) * rx * 0.3,
    y: cy - ry * 0.35,
    vx: 0,
    vy: 0.2,
  };
}

export function createBalls(): Ball[] {
  const tones = BOWL_CONFIG.ballTones;
  const balls: Ball[] = [];

  for (let i = 0; i < BOWL_CONFIG.ballCount; i++) {
    const spawn = randomSpawn();
    balls.push({
      id: i,
      number: Math.floor(Math.random() * 90) + 1,
      ...spawn,
      radius: randomBallRadius(),
      fill: tones[Math.floor(Math.random() * tones.length)] ?? "#cccccc",
      depth: Math.random(),
      phase: "inside",
      exitAfter: 0,
    });
  }

  return balls;
}

export function isInsideDrum(x: number, y: number, inset = 0): boolean {
  const { cx, cy, rx, ry } = BOWL_CONFIG.drum;
  const nx = (x - cx) / (rx - inset);
  const ny = (y - cy) / (ry - inset);
  return nx * nx + ny * ny <= 1;
}

function drumNormal(x: number, y: number): { nx: number; ny: number } {
  const { cx, cy, rx, ry } = BOWL_CONFIG.drum;
  const dx = (x - cx) / (rx * rx);
  const dy = (y - cy) / (ry * ry);
  const len = Math.hypot(dx, dy) || 1;
  return { nx: dx / len, ny: dy / len };
}

function inHoleZone(ball: Ball, drum: DrumGeometry): boolean {
  const dx = Math.abs(ball.x - drum.holeX);
  const nearBottom = ball.y > drum.cy + drum.ry - ball.radius * 3.5;
  return nearBottom && dx < drum.holeR * 1.15;
}

function canPassThroughHole(ball: Ball, drum: DrumGeometry): boolean {
  return (
    Math.abs(ball.x - drum.holeX) < drum.holeR * 0.85 &&
    ball.y > drum.cy + drum.ry - ball.radius * 4.5
  );
}

function resolveDrumWall(ball: Ball, drum: DrumGeometry) {
  if (ball.phase !== "inside") return;
  if (canPassThroughHole(ball, drum)) return;

  const { cx, cy, rx, ry } = drum;
  const margin = ball.radius * 0.9;
  const nx = (ball.x - cx) / (rx - margin);
  const ny = (ball.y - cy) / (ry - margin);
  const d = nx * nx + ny * ny;

  if (d <= 1) return;

  const { nx: nnx, ny: nny } = drumNormal(ball.x, ball.y);
  const dist = Math.hypot((ball.x - cx) / rx, (ball.y - cy) / ry);
  const pen = dist - 1 + margin / Math.min(rx, ry);
  ball.x -= nnx * pen * Math.min(rx, ry);
  ball.y -= nny * pen * Math.min(rx, ry);

  const vDot = ball.vx * nnx + ball.vy * nny;
  if (vDot > 0) {
    ball.vx -= (1 + P.wallRestitution) * vDot * nnx;
    ball.vy -= (1 + P.wallRestitution) * vDot * nny;
  }

  ball.vx *= P.friction;
  ball.vy *= P.friction;
}

function resolveBallPair(a: Ball, b: Ball) {
  if (a.phase === "recycling" || b.phase === "recycling") return;
  if (a.phase === "falling" || b.phase === "falling") return;

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

function applyMixerForces(balls: Ball[], sim: SimulationState, dtScale: number) {
  const drum = getDrumGeometry();
  const armLen = drum.rx * M.armLengthRatio;
  const shaftTop = drum.cy - drum.ry * M.shaftTopOffset;
  const shaftBottom = drum.cy + drum.ry * M.shaftBottomOffset;
  const cx = drum.cx;

  const arms = [sim.mixerAngle, sim.mixerAngle + Math.PI];

  for (const angle of arms) {
    const tipX = cx + Math.cos(angle) * armLen;
    const tipY = drum.cy + Math.sin(angle) * armLen * 0.62;

    for (let t = 0; t <= 1; t += 0.25) {
      const px = cx + (tipX - cx) * t;
      const py = shaftTop + (tipY - shaftTop) * t;

      for (const ball of balls) {
        if (ball.phase !== "inside") continue;
        const dx = ball.x - px;
        const dy = ball.y - py;
        const d = Math.hypot(dx, dy);
        if (d > M.impulseRadius + ball.radius) continue;

        const tangentX = -Math.sin(angle);
        const tangentY = Math.cos(angle) * 0.62;
        const strength = M.impulseStrength * dtScale * (1 - d / (M.impulseRadius + ball.radius));
        ball.vx += tangentX * strength;
        ball.vy += tangentY * strength;
      }
    }
  }

  for (const ball of balls) {
    if (ball.phase !== "inside") continue;
    const dx = ball.x - cx;
    if (Math.abs(dx) < 3 && ball.y > shaftTop && ball.y < shaftBottom) {
      ball.vx += (Math.random() - 0.5) * 0.04 * dtScale;
    }
  }
}

function tryExit(
  ball: Ball,
  drum: DrumGeometry,
  now: number,
  sim: SimulationState,
) {
  if (ball.phase !== "inside") return;
  if (sim.exitLocked || now < sim.nextExitAt || now < ball.exitAfter) return;
  if (!inHoleZone(ball, drum)) return;

  const dx = Math.abs(ball.x - drum.holeX);
  if (dx > drum.holeR * 0.75) return;
  if (ball.vy < -0.2) return;

  const speed = Math.hypot(ball.vx, ball.vy);
  const aligned = dx < drum.holeR * 0.5;
  const settling =
    speed < 0.55 && ball.y > drum.cy + drum.ry - ball.radius * 4.2;
  const dropping = ball.vy > 0.06;

  if (!aligned && !settling && !dropping) return;

  ball.phase = "falling";
  sim.exitLocked = true;
  ball.vx *= 0.2;
  ball.vy = Math.max(ball.vy, 0.65);
}

function recycleBall(ball: Ball, now: number, sim: SimulationState) {
  const spawn = randomSpawn();
  ball.x = spawn.x;
  ball.y = spawn.y;
  ball.vx = spawn.vx;
  ball.vy = Math.max(spawn.vy, 0.15);
  ball.phase = "inside";
  ball.exitAfter = now + BOWL_CONFIG.exit.respawnCooldownMs;
  sim.exitLocked = false;
  sim.nextExitAt = now + randomExitInterval();
}

export function stepSimulation(
  balls: Ball[],
  sim: SimulationState,
  dt: number,
  now: number,
  reducedMotion: boolean,
) {
  if (reducedMotion) return;

  const drum = getDrumGeometry();
  const dtScale = dt / 16.67;

  sim.mixerAngle += M.rotationSpeed * dt * 60;

  applyMixerForces(balls, sim, dtScale);

  for (const ball of balls) {
    if (ball.phase === "recycling") continue;

    if (ball.phase === "falling") {
      ball.vy += P.gravity * 1.55 * dtScale;
      ball.x += ball.vx * dtScale;
      ball.y += ball.vy * dtScale;
      ball.vx *= 0.994;

      if (ball.y > BOWL_CONFIG.exit.fallBelowY) {
        ball.phase = "recycling";
        recycleBall(ball, now, sim);
      }
      continue;
    }

    ball.vy += P.gravity * dtScale;

    if (Math.random() < P.microImpulseChance) {
      ball.vx += (Math.random() - 0.5) * P.microImpulseStrength;
      ball.vy += (Math.random() - 0.5) * P.microImpulseStrength * 0.45;
    }

    ball.x += ball.vx * dtScale;
    ball.y += ball.vy * dtScale;
    ball.vx *= P.damping;
    ball.vy *= P.damping;

    if (inHoleZone(ball, drum)) {
      ball.vy += P.gravity * 0.7 * dtScale;
      ball.vx += (drum.holeX - ball.x) * P.holePullStrength * dtScale;
    } else {
      resolveDrumWall(ball, drum);
    }

    tryExit(ball, drum, now, sim);
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

/** Static layout for reduced-motion — settled cluster in drum. */
export function settleBallsForStatic(balls: Ball[]) {
  const drum = getDrumGeometry();
  let i = 0;
  for (const ball of balls) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    ball.x =
      drum.cx - drum.rx * 0.45 + col * (drum.rx * 0.1) + (Math.random() - 0.5) * 4;
    ball.y =
      drum.cy + drum.ry * 0.15 + row * (ball.radius * 2.1) + (Math.random() - 0.5) * 2;
    ball.vx = 0;
    ball.vy = 0;
    ball.phase = "inside";
    i++;
  }
}
