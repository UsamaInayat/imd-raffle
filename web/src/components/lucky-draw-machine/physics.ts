import { BOWL_CONFIG, randomExitInterval } from "./config";
import type { Ball, DrumGeometry, SimulationState } from "./types";

const P = BOWL_CONFIG.physics;

export function getDrumGeometry(): DrumGeometry {
  const { cx, cy, radius } = BOWL_CONFIG.drum;
  const holeR = BOWL_CONFIG.hole.radius;
  return {
    cx,
    cy,
    radius,
    holeX: cx,
    holeY: cy + radius - holeR * 0.35,
    holeR,
  };
}

export function createSimulationState(now: number): SimulationState {
  return {
    mixerAngle: 0,
    nextExitAt: now + randomExitInterval() * 0.5,
    exitLocked: false,
    agitation: 0,
    lastClickAt: 0,
  };
}

export function isPointInDrum(x: number, y: number): boolean {
  const { cx, cy, radius } = BOWL_CONFIG.drum;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function agitationMultiplier(sim: SimulationState): number {
  return 0.68 + sim.agitation * 0.96;
}

function decayAgitation(sim: SimulationState, dtMs: number) {
  if (sim.agitation <= 0) return;
  sim.agitation = Math.max(
    0,
    sim.agitation - BOWL_CONFIG.interaction.decayPerSecond * (dtMs / 1000),
  );
}

/** Click inside the jar — stirs nearby balls and raises agitation. */
export function applyJarClick(
  balls: Ball[],
  sim: SimulationState,
  x: number,
  y: number,
  now: number,
  intensity = 1,
) {
  if (!isPointInDrum(x, y)) return;

  const { clickBoost, maxAgitation, impulseRadius, impulseStrength, rippleRadius } =
    BOWL_CONFIG.interaction;
  const boost = clickBoost * intensity;

  let localHits = 0;

  for (const ball of balls) {
    if (ball.phase !== "inside") continue;

    const dx = ball.x - x;
    const dy = ball.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist > rippleRadius || dist === 0) continue;

    const nx = dx / dist;
    const ny = dy / dist;
    const edge = 1 - dist / rippleRadius;
    const falloff = edge * edge * edge;
    const power = intensity * (0.52 + sim.agitation * 0.26);
    const inCore = dist <= impulseRadius;

    if (!inCore && falloff < 0.06) continue;

    if (inCore) {
      localHits++;
      const push = impulseStrength * falloff * power;
      ball.vx += nx * push;
      ball.vy += ny * push;
      ball.vx += (Math.random() - 0.5) * 0.28 * falloff * power;
      ball.vy += (Math.random() - 0.5) * 0.24 * falloff * power;
    } else {
      const soft = impulseStrength * falloff * power * 0.28;
      ball.vx += nx * soft;
      ball.vy += ny * soft;
    }
  }

  if (localHits > 0) {
    const localBoost = boost * Math.min(1, localHits / 4);
    sim.agitation = Math.min(maxAgitation, sim.agitation + localBoost);
    sim.lastClickAt = now;
  }
}

function randomBallRadius(): number {
  const { min, max } = BOWL_CONFIG.ballRadius;
  return min + Math.random() * (max - min);
}

function randomTone(): string {
  const tones = BOWL_CONFIG.ballTones;
  return tones[Math.floor(Math.random() * tones.length)] ?? "#000000";
}

function computeFishbowlDepth(x: number, y: number, drum: DrumGeometry): number {
  const top = drum.cy - drum.radius;
  const relY = (y - top) / (drum.radius * 2);
  const curved = Math.pow(Math.max(0, Math.min(1, relY)), 0.82);
  const edgeFalloff =
    1 - Math.pow(Math.abs(x - drum.cx) / (drum.radius * 0.92), 1.4) * 0.18;
  return Math.max(0, Math.min(1, curved * edgeFalloff));
}

function updateBallDepth(ball: Ball, drum: DrumGeometry) {
  ball.depth = computeFishbowlDepth(ball.x, ball.y, drum);
}

function updateBallDepthValue(x: number, y: number, drum: DrumGeometry): number {
  return computeFishbowlDepth(x, y, drum);
}

function isBallSupported(ball: Ball, balls: Ball[]): boolean {
  for (const other of balls) {
    if (other === ball || other.phase === "falling") continue;
    const dx = Math.abs(other.x - ball.x);
    const dy = other.y - ball.y;
    const reach = ball.radius + other.radius + 1.2;
    if (dy > 0 && dy < reach && dx < reach) return true;
  }
  return false;
}

function effectiveGravity(ball: Ball, balls: Ball[], g: number): number {
  if (ball.phase !== "inside") return g;
  return isBallSupported(ball, balls) ? g * P.supportedGravityScale : g;
}

function spawnInLowerDrum(): { x: number; y: number; vx: number; vy: number } {
  const drum = getDrumGeometry();
  for (let i = 0; i < 80; i++) {
    const angle = Math.PI * 0.08 + Math.random() * Math.PI * 0.84;
    const dist = 0.42 + Math.random() * 0.48;
    const x = drum.cx + Math.cos(angle) * drum.radius * dist * 0.82;
    const y = drum.cy + Math.sin(angle) * drum.radius * dist * 0.92;
    if (isInsideDrum(x, y, BOWL_CONFIG.ballRadius.default)) {
      return {
        x,
        y,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.12,
      };
    }
  }
  return {
    x: drum.cx + (Math.random() - 0.5) * 40,
    y: drum.cy + drum.radius * 0.42,
    vx: 0,
    vy: 0.05,
  };
}

function packInitialBalls(): Ball[] {
  const drum = getDrumGeometry();
  const balls: Ball[] = [];
  const defaultR = BOWL_CONFIG.ballRadius.default;
  const wallInset = defaultR * 1.08;
  const rowH = defaultR * 1.46;
  const spacing = defaultR * 1.95;

  const bottomY = drum.cy + drum.radius - wallInset;
  const topY = drum.cy - defaultR * 0.5;

  let id = 0;
  let row = 0;

  for (let y = bottomY; y >= topY && id < BOWL_CONFIG.ballCount; y -= rowH, row++) {
    const dy = y - drum.cy;
    const innerR = drum.radius - wallInset;
    const halfChord = Math.sqrt(Math.max(0, innerR * innerR - dy * dy));
    if (halfChord < defaultR * 0.6) continue;

    const cols = Math.max(1, Math.floor((halfChord * 2) / spacing));
    const rowOffset = row % 2 === 0 ? 0 : spacing * 0.48;

    for (let col = 0; col < cols && id < BOWL_CONFIG.ballCount; col++) {
      const x =
        drum.cx -
        ((cols - 1) * spacing) / 2 +
        col * spacing +
        rowOffset +
        (Math.random() - 0.5) * 0.5;
      const radius = randomBallRadius();

      if (!isInsideDrum(x, y, radius * 0.4)) continue;

      balls.push({
        id,
        number: Math.floor(Math.random() * 99) + 1,
        x,
        y,
        vx: 0,
        vy: 0,
        radius,
        fill: randomTone(),
        depth: updateBallDepthValue(x, y, drum),
        phase: "inside",
        exitAfter: 0,
        fallStartedAt: 0,
      });
      id++;
    }
  }

  while (id < BOWL_CONFIG.ballCount) {
    const spawn = spawnInLowerDrum();
    const radius = randomBallRadius();
    balls.push({
      id,
      number: Math.floor(Math.random() * 99) + 1,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      radius,
      fill: randomTone(),
      depth: updateBallDepthValue(spawn.x, spawn.y, drum),
      phase: "inside",
      exitAfter: 0,
      fallStartedAt: 0,
    });
    id++;
  }

  return balls;
}

export function createBalls(): Ball[] {
  return packInitialBalls();
}

export function isInsideDrum(x: number, y: number, inset = 0): boolean {
  const { cx, cy, radius } = BOWL_CONFIG.drum;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= (radius - inset) * (radius - inset);
}

/** Visual helper — bottom funnel region near the outlet. */
export function inHoleZone(ball: Ball, drum: DrumGeometry): boolean {
  const dx = Math.abs(ball.x - drum.holeX);
  const nearBottom = ball.y > drum.cy + drum.radius - ball.radius * 3.2;
  return nearBottom && dx < drum.holeR * 1.4;
}

/** Visual helper — ball extends through bottom rim / gap. */
export function inGapChute(ball: Ball, drum: DrumGeometry): boolean {
  const dx = Math.abs(ball.x - drum.holeX);
  return (
    dx < drum.holeR * 1.1 &&
    ball.y > drum.cy + drum.radius - ball.radius * 2.8
  );
}

function ballInGap(ball: Ball, drum: DrumGeometry): boolean {
  const dx = Math.abs(ball.x - drum.holeX);
  const atOutlet = ball.y > drum.cy + drum.radius - ball.radius * 2.2;
  return atOutlet && dx < drum.holeR * 0.88;
}

function ballPushedIntoGap(ball: Ball, drum: DrumGeometry): boolean {
  const dx = Math.abs(ball.x - drum.holeX);
  return (
    dx < drum.holeR * 1.05 &&
    ball.y > drum.cy + drum.radius - ball.radius * 3 &&
    ball.vy > 0.45
  );
}

function canFallThroughGap(ball: Ball, drum: DrumGeometry): boolean {
  return (
    ball.phase === "falling" &&
    Math.abs(ball.x - drum.holeX) < drum.holeR * 0.92
  );
}

function hasFallingBall(balls: Ball[]): boolean {
  return balls.some((b) => b.phase === "falling");
}

function beginFall(
  ball: Ball,
  now: number,
  sim: SimulationState,
  balls: Ball[],
): boolean {
  if (sim.exitLocked || hasFallingBall(balls)) return false;
  ball.phase = "falling";
  ball.fallStartedAt = now;
  ball.depth = 0.96;
  ball.vx *= 0.3;
  ball.vy = Math.max(ball.vy, P.exitMinVy);
  sim.exitLocked = true;
  return true;
}

/** Rigid glass wall — inside balls never pass through; falling balls use the gap only. */
function resolveDrumWall(ball: Ball, drum: DrumGeometry) {
  if (canFallThroughGap(ball, drum)) return;

  const dx = ball.x - drum.cx;
  const dy = ball.y - drum.cy;
  const dist = Math.hypot(dx, dy);
  const maxDist = drum.radius - ball.radius;
  if (dist <= maxDist || dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;
  ball.x = drum.cx + nx * maxDist;
  ball.y = drum.cy + ny * maxDist;

  const vDot = ball.vx * nx + ball.vy * ny;
  if (vDot > 0) {
    ball.vx -= (1 + P.wallRestitution) * vDot * nx;
    ball.vy -= (1 + P.wallRestitution) * vDot * ny;
  }

  ball.vx *= P.friction;
  ball.vy *= P.friction;
}

function resolveBallPair(
  a: Ball,
  b: Ball,
  drum: DrumGeometry,
  agitation = 0.5,
) {
  if (a.phase === "falling" || b.phase === "falling") return;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;
  if (dist >= minDist || dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  const slop = 0.02;
  const correction = Math.max(overlap - slop, 0) * 0.55 + Math.min(overlap, slop) * 0.5;

  a.x -= nx * correction;
  a.y -= ny * correction;
  b.x += nx * correction;
  b.y += ny * correction;

  const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (rel <= 0) return;

  const impulse = ((1 + P.ballRestitution) * rel) / 2;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;

  const pileLine = drum.cy + drum.radius * 0.12;
  if (a.y > pileLine || b.y > pileLine) {
    const mult = 0.5 + agitation * 1.1;
    const ripple = Math.min(rel * P.collisionAgitation * mult, 0.62);
    if (a.y <= b.y) a.vy -= ripple;
    else b.vy -= ripple;
  }
}

function clampSpeed(ball: Ball) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > P.maxSpeed) {
    ball.vx = (ball.vx / speed) * P.maxSpeed;
    ball.vy = (ball.vy / speed) * P.maxSpeed;
  }
}

function applyAmbientBubbles(
  balls: Ball[],
  drum: DrumGeometry,
  dtScale: number,
  agitation: number,
) {
  const lowerCutoff = drum.cy - drum.radius * 0.08;
  const mult = 0.7 + agitation * 0.92;

  for (const ball of balls) {
    if (ball.phase !== "inside") continue;
    if (ball.y < lowerCutoff) continue;

    const atHole = inHoleZone(ball, drum);
    const chance =
      (atHole ? P.bubbleChance * 0.5 : P.bubbleChance) * dtScale * mult;
    if (Math.random() > chance) continue;

    const strength =
      (atHole ? P.bubbleStrength * 0.65 : P.bubbleStrength) * mult;
    ball.vy -= strength * (0.75 + Math.random() * 0.95);
    ball.vx += (Math.random() - 0.5) * (atHole ? 0.18 : 0.42) * mult;
  }
}

function tryExitBestCandidate(
  balls: Ball[],
  drum: DrumGeometry,
  now: number,
  sim: SimulationState,
) {
  if (sim.exitLocked) return;

  const agitated = sim.agitation > 0.45;
  const rushExit =
    agitated && Math.random() < (sim.agitation - 0.45) * 1.85;
  if (now < sim.nextExitAt && !rushExit) return;

  const gapSlack = drum.holeR * (0.82 + sim.agitation * 0.35);
  let best: Ball | null = null;
  let bestScore = Infinity;

  for (const ball of balls) {
    if (ball.phase !== "inside") continue;

    const seated = ballInGap(ball, drum);
    const pushed = ballPushedIntoGap(ball, drum);
    const agitatedLoose =
      agitated &&
      ball.y > drum.cy + drum.radius - ball.radius * 3.8 &&
      Math.abs(ball.x - drum.holeX) < gapSlack;

    if (!seated && !pushed && !agitatedLoose) continue;
    if (seated && ball.vy < -0.55 && sim.agitation < 0.65) continue;

    const dx = Math.abs(ball.x - drum.holeX);
    const outletY = drum.cy + drum.radius - ball.radius * 1.05;
    const score =
      dx * 2.2 +
      Math.abs(ball.y - outletY) -
      (pushed || agitatedLoose ? ball.vy * 1.6 : 0) -
      sim.agitation * 4;
    if (score < bestScore) {
      bestScore = score;
      best = ball;
    }
  }

  if (!best) return;
  if (Math.abs(best.x - drum.holeX) > gapSlack) return;

  if (
    sim.agitation > 0.78 &&
    !ballInGap(best, drum) &&
    Math.random() > (sim.agitation - 0.78) * 4
  ) {
    return;
  }

  beginFall(best, now, sim, balls);
}

function releaseExitLock(sim: SimulationState, now: number) {
  sim.exitLocked = false;
  const base = randomExitInterval();
  const rush = 1.05 - sim.agitation * 0.62;
  sim.nextExitAt = now + base * Math.max(0.4, rush);
}

function stepBallsOnce(
  balls: Ball[],
  sim: SimulationState,
  dtScale: number,
  now: number,
  settling = false,
) {
  const drumGeo = getDrumGeometry();
  const g = P.gravity;
  const toRemove = new Set<number>();

  const churn = settling ? 0.2 : agitationMultiplier(sim);

  if (!settling) {
    const bubbleAgitation = Math.max(0, sim.agitation - 0.08);
    applyAmbientBubbles(balls, drumGeo, dtScale, bubbleAgitation);
  }

  for (const ball of balls) {
    if (ball.phase === "falling") {
      ball.vy += g * P.fallGravityScale * dtScale;
      ball.x += ball.vx * dtScale;
      ball.y += ball.vy * dtScale;
      ball.vx *= 0.994;
      ball.depth = 0.96;

      if (ball.y > BOWL_CONFIG.exit.removeBelowY) {
        toRemove.add(ball.id);
      }
      continue;
    }

    ball.vy += effectiveGravity(ball, balls, g) * dtScale;

    if (!settling && ball.y > drumGeo.cy - drumGeo.radius * 0.2) {
      const atHole = inHoleZone(ball, drumGeo);
      const chance =
        (atHole ? P.microImpulseChance * 0.55 : P.microImpulseChance) *
        dtScale *
        churn;
      if (Math.random() < chance) {
        const s =
          (atHole ? P.microImpulseStrength * 0.7 : P.microImpulseStrength) *
          churn;
        ball.vx += (Math.random() - 0.5) * s;
        ball.vy += (Math.random() - 0.5) * s * 0.45;
        if (Math.random() < 0.42) {
          ball.vy -= s * 0.55;
        }
      }
    }

    ball.x += ball.vx * dtScale;
    ball.y += ball.vy * dtScale;
    ball.vx *= P.damping;
    ball.vy *= P.damping;
  }

  const passes = settling
    ? 3
    : sim.agitation > 0.4
      ? P.collisionPassesAgitated
      : P.collisionPasses;
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        resolveBallPair(balls[i], balls[j], drumGeo, sim.agitation);
      }
    }
    for (const ball of balls) {
      if (ball.phase !== "falling") {
        resolveDrumWall(ball, drumGeo);
      }
    }
  }

  if (!settling) {
    for (const ball of balls) {
      if (ball.phase !== "inside") continue;
      if (
        inHoleZone(ball, drumGeo) &&
        !sim.exitLocked &&
        !hasFallingBall(balls)
      ) {
        const holeChurn = 0.34 + churn * 0.5;
        ball.vy += g * 0.38 * dtScale * holeChurn;
        ball.vx +=
          (drumGeo.holeX - ball.x) * P.holePullStrength * dtScale * holeChurn;
      }
      updateBallDepth(ball, drumGeo);
      clampSpeed(ball);
    }
  }

  if (toRemove.size > 0) {
    for (let i = balls.length - 1; i >= 0; i--) {
      if (toRemove.has(balls[i].id)) balls.splice(i, 1);
    }
    if (!hasFallingBall(balls)) {
      releaseExitLock(sim, now);
    }
  }

  if (!settling) {
    tryExitBestCandidate(balls, drumGeo, now, sim);
  }
}

export function stepSimulation(
  balls: Ball[],
  sim: SimulationState,
  dt: number,
  now: number,
  reducedMotion: boolean,
) {
  if (reducedMotion) return;

  decayAgitation(sim, dt);

  const dtScale = dt / 16.67;
  for (let s = 0; s < P.substeps; s++) {
    stepBallsOnce(balls, sim, dtScale / P.substeps, now);
  }
}

function snapPileToFloor(balls: Ball[], drum: DrumGeometry) {
  const floorY =
    drum.cy + drum.radius - BOWL_CONFIG.ballRadius.default * 1.08;
  let lowest = -Infinity;
  for (const ball of balls) {
    lowest = Math.max(lowest, ball.y + ball.radius);
  }
  if (lowest >= floorY) return;

  const shift = floorY - lowest;
  for (const ball of balls) {
    ball.y += shift;
    resolveDrumWall(ball, drum);
  }
}

export function settlePackedBalls(balls: Ball[]) {
  const drum = getDrumGeometry();
  const sim = createSimulationState(0);

  for (let iter = 0; iter < P.settleIterations; iter++) {
    for (const ball of balls) {
      if (ball.phase !== "inside") continue;
      resolveDrumWall(ball, drum);
    }
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          resolveBallPair(balls[i], balls[j], drum);
        }
      }
      for (const ball of balls) {
        resolveDrumWall(ball, drum);
      }
    }
  }

  snapPileToFloor(balls, drum);

  for (let i = 0; i < 30; i++) {
    stepBallsOnce(balls, sim, 0.6, 0, true);
    snapPileToFloor(balls, drum);
  }

  for (const ball of balls) {
    ball.vx = (Math.random() - 0.5) * 0.35;
    ball.vy = (Math.random() - 0.5) * 0.2;
    updateBallDepth(ball, drum);
  }
}

export function formatBallNumber(n: number): string {
  return n.toString().padStart(2, "0");
}

export function settleBallsForStatic(balls: Ball[]) {
  const packed = packInitialBalls();
  balls.forEach((ball, i) => {
    const src = packed[i];
    if (!src) return;
    ball.x = src.x;
    ball.y = src.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.phase = "inside";
    ball.depth = src.depth;
  });
  snapPileToFloor(balls, getDrumGeometry());
}
