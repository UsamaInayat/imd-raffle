export type BallPhase = "inside" | "falling" | "recycling";

export type Ball = {
  id: number;
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fill: string;
  /** 0 = back, 1 = front — used for depth sorting & shading. */
  depth: number;
  phase: BallPhase;
  exitAfter: number;
};

export type DrumGeometry = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  holeX: number;
  holeY: number;
  holeR: number;
};

export type SimulationState = {
  mixerAngle: number;
  nextExitAt: number;
  exitLocked: boolean;
};
