/** Lottery ball drum — tune physics, timing, and look here. */
export const BOWL_CONFIG = {
  width: 480,
  height: 580,

  ballCount: 80,
  ballRadius: { min: 5.4, max: 8.2, default: 6.8 },

  /** Spherical/oval glass drum (logical coordinates). */
  drum: {
    cx: 240,
    cy: 248,
    rx: 132,
    ry: 168,
  },

  /** Bottom outlet — ~1.5 ball diameters. */
  hole: {
    radius: 11,
  },

  mixer: {
    /** Shaft spans this fraction of drum height (from top interior). */
    shaftTopOffset: 0.22,
    shaftBottomOffset: 0.48,
    armLengthRatio: 0.38,
    armStroke: 1.4,
    /** Radians per ms at 60fps baseline. */
    rotationSpeed: 0.00055,
    impulseRadius: 14,
    impulseStrength: 0.42,
  },

  exit: {
    minIntervalMs: 2000,
    maxIntervalMs: 5000,
    respawnCooldownMs: 400,
    fallBelowY: 620,
  },

  physics: {
    gravity: 0.105,
    damping: 0.988,
    wallRestitution: 0.4,
    ballRestitution: 0.46,
    friction: 0.992,
    maxSpeed: 5.2,
    microImpulseChance: 0.004,
    microImpulseStrength: 0.22,
    holePullStrength: 0.0035,
  },

  ballTones: [
    "#ffffff",
    "#eeeeee",
    "#dddddd",
    "#bbbbbb",
    "#999999",
    "#777777",
    "#555555",
    "#333333",
    "#111111",
  ],

  showNumbers: true,

  colors: {
    glassStroke: "rgba(0,0,0,0.42)",
    glassInnerStroke: "rgba(255,255,255,0.28)",
    glassFill: "rgba(255,255,255,0.03)",
    glassHighlight: "rgba(255,255,255,0.45)",
    glassSheen: "rgba(255,255,255,0.12)",
    shadow: "rgba(0,0,0,0.06)",
    mixer: "#1a1a1a",
    mixerArm: "#333333",
    outletRing: "rgba(0,0,0,0.5)",
    outletInner: "rgba(0,0,0,0.65)",
    numberLight: "#f5f5f5",
    numberDark: "#111111",
  },
} as const;

export function randomExitInterval(): number {
  const { minIntervalMs, maxIntervalMs } = BOWL_CONFIG.exit;
  return minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs);
}
