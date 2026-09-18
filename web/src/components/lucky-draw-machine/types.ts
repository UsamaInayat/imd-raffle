export type BallPhase = "inside" | "falling";

export type Ball = {
  id: number;
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fill: string;
  /** 0 = back, 1 = front — depth sorting & shading. */
  depth: number;
  phase: BallPhase;
  exitAfter: number;
  fallStartedAt: number;
};

export type DrumGeometry = {
  cx: number;
  cy: number;
  radius: number;
  holeX: number;
  holeY: number;
  holeR: number;
};

export type SimulationState = {
  mixerAngle: number;
  nextExitAt: number;
  exitLocked: boolean;
  /** 0–1 — raised by clicks inside the jar, decays when idle. */
  agitation: number;
  lastClickAt: number;
};
