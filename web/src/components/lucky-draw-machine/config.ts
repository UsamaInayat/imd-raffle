/** Premium monochrome lottery drum — tune here. */
export const BOWL_CONFIG = {
  width: 520,
  height: 600,

  ballCount: 244,
  ballRadius: { min: 6, max: 7.2, default: 6.3 },

  /** Fishbowl POV — front (bottom) large, back (top) small. */
  perspective: {
    scaleMin: 0.44,
    scaleMax: 1.72,
    alphaMin: 0.48,
    alphaMax: 1,
    numberCutoff: 0.28,
  },

  /** Circular glass drum (reference: perfect sphere). */
  drum: {
    cx: 260,
    cy: 292,
    radius: 172,
  },

  /** Bottom outlet — ~1.2 ball diameters. */
  hole: {
    radius: 9,
  },

  mixer: {
    pillarWidth: 10,
    pillarTopRatio: -0.93,
    pillarBottomRatio: -0.14,
    /** Pivot sits just above center — rods sweep down into the pile. */
    pivotYRatio: -0.12,
    rodLengthRatio: 0.36,
    vSpread: 0.54,
    rodWidth: 2.4,
    capRadius: 3,
    rotationSpeed: 0.000014,
    impulseRadius: 18,
    impulseStrength: 0.42,
  },

  exit: {
    minIntervalMs: 650,
    maxIntervalMs: 1400,
    /** Remove the ball once it falls this far below the canvas. */
    removeBelowY: 640,
  },

  /** Cursor interaction inside the jar. */
  interaction: {
    /** Global churn from clicks — kept low; most stir is local only. */
    clickBoost: 0.052,
    dragBoostScale: 0.28,
    maxAgitation: 1,
    decayPerSecond: 0.24,
    /** Strong push — balls within this radius of the cursor. */
    impulseRadius: 38,
    impulseStrength: 1.2,
    /** Outer edge — soft ripple beyond impulseRadius. */
    rippleRadius: 52,
  },

  physics: {
    gravity: 0.115,
    damping: 0.992,
    supportedGravityScale: 0.38,
    wallRestitution: 0.28,
    ballRestitution: 0.46,
    friction: 0.987,
    maxSpeed: 8.2,
    microImpulseChance: 0.018,
    microImpulseStrength: 0.32,
    bubbleChance: 0.027,
    bubbleStrength: 0.86,
    holePullStrength: 0.013,
    collisionAgitation: 0.13,
    exitMinVy: 1.45,
    fallGravityScale: 2.15,
    substeps: 3,
    collisionPasses: 4,
    collisionPassesAgitated: 6,
    settleIterations: 90,
  },

  ballTones: [
    "#ffffff",
    "#dddddd",
    "#999999",
    "#555555",
    "#222222",
    "#000000",
  ],

  showNumbers: true,

  colors: {
    /** Glass vessel — clear interior, visible rim only. */
    glassOuter: "rgba(0,0,0,0.32)",
    glassInner: "rgba(255,255,255,0.45)",
    glassHighlight: "rgba(255,255,255,0.72)",
    glassHighlight2: "rgba(255,255,255,0.28)",
    glassFresnel: "rgba(255,255,255,0.14)",
    glassRimShadow: "rgba(0,0,0,0.08)",
    outletRim: "rgba(0,0,0,0.18)",
    outletVoid: "rgba(0,0,0,0.35)",
    contactShadow: "rgba(0,0,0,0.045)",
    /** Brushed aluminium pillar & rods. */
    pillarTop: "#eeeeee",
    pillarMid: "#cccccc",
    pillarBottom: "#aaaaaa",
    pillarEdge: "rgba(0,0,0,0.16)",
    rod: "#666666",
    rodHighlight: "#999999",
    rodShadow: "#333333",
    rodCap: "#444444",
    rodCapHighlight: "#777777",
    numberLight: "#ffffff",
    numberDark: "#0a0a0a",
  },
} as const;

export function randomExitInterval(): number {
  const { minIntervalMs, maxIntervalMs } = BOWL_CONFIG.exit;
  return minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs);
}
