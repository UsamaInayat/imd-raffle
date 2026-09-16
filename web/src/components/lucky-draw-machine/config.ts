/** Tunable machine + animation settings — edit here to customize the draw. */
export const MACHINE_CONFIG = {
  /** Internal canvas coordinate width (CSS scales to fit container). */
  width: 480,
  /** Internal canvas coordinate height. */
  height: 620,

  /** Number of lottery balls in the chamber. */
  ballCount: 60,
  /** Ball radius in internal pixels. */
  ballRadius: 8.5,

  /** Glass chamber ellipse — center + radii. */
  chamber: {
    cx: 200,
    cy: 268,
    rx: 118,
    ry: 158,
  },

  /** Rotating paddle / agitator at chamber floor. */
  agitator: {
    cx: 200,
    cy: 388,
    armLength: 52,
    width: 7,
    idleSpeed: 0.35,
    mixSpeed: 4.2,
  },

  /** Funnel + vertical channel toward the gate. */
  funnel: {
    top: { x: 200, y: 400 },
    gate: { x: 318, y: 368 },
  },

  /** Horizontal output spout on the right. */
  output: {
    start: { x: 318, y: 368 },
    end: { x: 448, y: 368 },
    tubeRadius: 14,
    exit: { x: 462, y: 368 },
  },

  /** Machine base / stand geometry. */
  base: {
    top: 498,
    bottom: 610,
    left: 72,
    right: 408,
  },

  /** Vintage lottery ball palette — muted, not neon. */
  ballColors: [
    "#b84a3a",
    "#3d5f7a",
    "#7a6b3a",
    "#4a6b52",
    "#6b4a5a",
    "#5a5a72",
    "#8a6840",
    "#4a6878",
  ],

  physics: {
    gravity: 0.22,
    idleDamping: 0.987,
    mixDamping: 0.992,
    wallRestitution: 0.58,
    ballRestitution: 0.62,
    mixImpulse: 2.4,
    agitatorForce: 0.85,
    maxSpeed: 7.5,
  },

  /** State durations in milliseconds — each state picks random in [min, max]. */
  timing: {
    idle: { min: 2200, max: 3800 },
    mixing: { min: 2800, max: 4000 },
    selecting: { min: 1200, max: 1800 },
    chamberToFunnel: { min: 700, max: 1200 },
    inChannel: { min: 500, max: 900 },
    gateOpening: { min: 350, max: 650 },
    output: { min: 900, max: 1400 },
    result: { min: 2800, max: 4200 },
    reset: { min: 600, max: 900 },
  },

  colors: {
    background: "#f7f7f5",
    metalDark: "#1c1c1c",
    metalMid: "#3a3a3a",
    metalLight: "#5c5c5c",
    brass: "#8a7d62",
    brassHighlight: "#b8a882",
    glassFill: "rgba(255,255,255,0.06)",
    glassStroke: "rgba(0,0,0,0.42)",
    glassHighlight: "rgba(255,255,255,0.55)",
    shadow: "rgba(0,0,0,0.18)",
    ballText: "#ffffff",
    ballTextShadow: "rgba(0,0,0,0.45)",
    selectedRing: "#000000",
  },

  /** Enable subtle mechanical sounds after user interaction. */
  soundEnabled: false,
} as const;

export type MachineConfig = typeof MACHINE_CONFIG;
