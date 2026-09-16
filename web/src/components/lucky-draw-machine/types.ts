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
  phase: BallPhase;
  /** Earliest time (ms) this ball may exit again. */
  exitAfter: number;
};

export type BowlGeometry = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  holeX: number;
  holeY: number;
  holeR: number;
};
