export type DrawState =
  | "idle"
  | "mixing"
  | "selecting"
  | "chamberToFunnel"
  | "inChannel"
  | "gateOpening"
  | "output"
  | "result"
  | "reset";

export type Ball = {
  id: number;
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  /** 0–1 depth for render ordering & slight size bias. */
  depth: number;
  /** When true, physics loop skips this ball (animated on rails). */
  kinematic: boolean;
};

export type MachineSnapshot = {
  state: DrawState;
  stateStartedAt: number;
  stateDuration: number;
  agitatorAngle: number;
  gateOpen: number;
  selectedBallId: number | null;
  selectedNumber: number | null;
  isDrawing: boolean;
  reducedMotion: boolean;
  hoverIntensity: number;
  /** 0–1 progress within current kinematic segment. */
  pathProgress: number;
  pathFrom: { x: number; y: number };
  pathTo: { x: number; y: number };
};
