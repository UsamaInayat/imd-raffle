/** Minimalist bowl animation — edit constants here to tune look & physics. */
export const BOWL_CONFIG = {
  width: 420,
  height: 520,

  ballCount: 55,
  ballRadius: 7,

  /** Tall rounded glass jar (ellipse). */
  bowl: {
    cx: 210,
    cy: 238,
    rx: 112,
    ry: 152,
  },

  /** Small opening at the lowest point of the jar. */
  hole: {
    radius: 10,
  },

  physics: {
    gravity: 0.11,
    damping: 0.989,
    wallRestitution: 0.42,
    ballRestitution: 0.48,
    maxSpeed: 4.8,
    /** Occasional tiny nudge so the system never fully freezes. */
    microImpulseChance: 0.006,
    microImpulseStrength: 0.28,
    /** Min ms before same ball can exit again after recycle. */
    respawnCooldown: 800,
  },

  /** Monochrome ball fills — cycle through these. */
  ballTones: ["#ffffff", "#ececec", "#c8c8c8", "#8a8a8a", "#404040", "#141414"],

  /** Draw tiny numbers on balls (set false if too cluttered). */
  showNumbers: true,

  colors: {
    glassStroke: "rgba(0,0,0,0.38)",
    glassFill: "rgba(255,255,255,0.04)",
    glassHighlight: "rgba(255,255,255,0.35)",
    hole: "rgba(0,0,0,0.55)",
    numberLight: "#ffffff",
    numberDark: "#1a1a1a",
  },
} as const;
