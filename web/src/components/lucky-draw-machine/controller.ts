import { MACHINE_CONFIG } from "./config";
import {
  createBalls,
  easeInOutCubic,
  lerp,
  selectRandomBall,
  stepPhysics,
} from "./physics";
import type { Ball, DrawState, MachineSnapshot } from "./types";

const { timing, agitator, funnel, output } = MACHINE_CONFIG;

function randomDuration(range: { min: number; max: number }): number {
  return range.min + Math.random() * (range.max - range.min);
}

export class DrawController {
  balls: Ball[] = createBalls(MACHINE_CONFIG.ballCount);
  snapshot: MachineSnapshot = this.initialSnapshot();
  private rafId = 0;
  private lastFrame = 0;
  private onResult?: (n: number) => void;

  constructor(onResult?: (n: number) => void) {
    this.onResult = onResult;
  }

  private initialSnapshot(): MachineSnapshot {
    return {
      state: "idle",
      stateStartedAt: performance.now(),
      stateDuration: randomDuration(timing.idle),
      agitatorAngle: 0,
      gateOpen: 0,
      selectedBallId: null,
      selectedNumber: null,
      isDrawing: false,
      reducedMotion: false,
      hoverIntensity: 0,
      pathProgress: 0,
      pathFrom: { x: 0, y: 0 },
      pathTo: { x: 0, y: 0 },
    };
  }

  setReducedMotion(reduced: boolean) {
    this.snapshot.reducedMotion = reduced;
  }

  setHover(intensity: number) {
    this.snapshot.hoverIntensity = Math.max(0, Math.min(1, intensity));
  }

  startDraw() {
    if (this.snapshot.isDrawing) return;
    this.snapshot.isDrawing = true;
    this.snapshot.selectedNumber = null;
    this.snapshot.gateOpen = 0;

    if (this.snapshot.reducedMotion) {
      const picked = selectRandomBall(this.balls);
      this.snapshot.selectedBallId = picked.id;
      this.snapshot.selectedNumber = picked.number;
      picked.kinematic = true;
      picked.x = output.exit.x;
      picked.y = output.exit.y;
      this.transition("result");
      return;
    }

    this.transition("mixing");
  }

  private transition(next: DrawState) {
    const s = this.snapshot;
    s.state = next;
    s.stateStartedAt = performance.now();
    s.pathProgress = 0;

    switch (next) {
      case "idle":
        s.stateDuration = randomDuration(timing.idle);
        s.isDrawing = false;
        s.selectedBallId = null;
        s.gateOpen = 0;
        for (const b of this.balls) b.kinematic = false;
        break;
      case "mixing":
        s.stateDuration = randomDuration(timing.mixing);
        break;
      case "selecting":
        s.stateDuration = randomDuration(timing.selecting);
        break;
      case "chamberToFunnel": {
        s.stateDuration = randomDuration(timing.chamberToFunnel);
        const ball = this.getSelectedBall();
        if (ball) {
          s.pathFrom = { x: ball.x, y: ball.y };
          s.pathTo = { ...funnel.top };
          ball.kinematic = true;
        }
        break;
      }
      case "inChannel":
        s.stateDuration = randomDuration(timing.inChannel);
        s.pathFrom = { ...funnel.top };
        s.pathTo = { ...funnel.gate };
        break;
      case "gateOpening":
        s.stateDuration = randomDuration(timing.gateOpening);
        break;
      case "output":
        s.stateDuration = randomDuration(timing.output);
        s.pathFrom = { ...output.start };
        s.pathTo = { ...output.exit };
        break;
      case "result":
        s.stateDuration = randomDuration(timing.result);
        this.onResult?.(this.snapshot.selectedNumber ?? 0);
        break;
      case "reset":
        s.stateDuration = randomDuration(timing.reset);
        break;
    }
  }

  private getSelectedBall(): Ball | undefined {
    if (this.snapshot.selectedBallId === null) return undefined;
    return this.balls.find((b) => b.id === this.snapshot.selectedBallId);
  }

  private pickBall() {
    const picked = selectRandomBall(this.balls);
    this.snapshot.selectedBallId = picked.id;
    this.snapshot.selectedNumber = picked.number;
    for (const b of this.balls) {
      if (b.id !== picked.id) {
        b.vx *= 0.4;
        b.vy *= 0.4;
      }
    }
  }

  private updateKinematicPath(t: number) {
    const ball = this.getSelectedBall();
    if (!ball) return;
    const eased = easeInOutCubic(Math.min(1, t));
    ball.x = lerp(this.snapshot.pathFrom.x, this.snapshot.pathTo.x, eased);
    ball.y = lerp(this.snapshot.pathFrom.y, this.snapshot.pathTo.y, eased);
    this.snapshot.pathProgress = eased;
  }

  tick(now: number) {
    const dt = Math.min(32, now - this.lastFrame || 16);
    this.lastFrame = now;

    const s = this.snapshot;
    const elapsed = now - s.stateStartedAt;
    const t = Math.min(1, elapsed / s.stateDuration);

    const mixing =
      s.state === "mixing" ||
      (s.state === "selecting" && t < 0.85);

    const agitatorSpeed =
      s.state === "mixing"
        ? agitator.mixSpeed
        : s.state === "idle"
          ? agitator.idleSpeed
          : agitator.idleSpeed * 0.6;

    s.agitatorAngle += agitatorSpeed * (dt / 1000);

    if (!s.reducedMotion) {
      stepPhysics(this.balls, { mixing, agitatorAngle: s.agitatorAngle, dt });
    }

    switch (s.state) {
      case "idle":
        if (elapsed >= s.stateDuration && !s.isDrawing) {
          /* stay idle until user draws */
        }
        break;

      case "mixing":
        if (elapsed >= s.stateDuration) this.transition("selecting");
        break;

      case "selecting":
        if (s.selectedBallId === null && t > 0.35) this.pickBall();
        if (elapsed >= s.stateDuration) this.transition("chamberToFunnel");
        break;

      case "chamberToFunnel":
        this.updateKinematicPath(t);
        if (elapsed >= s.stateDuration) this.transition("inChannel");
        break;

      case "inChannel":
        this.updateKinematicPath(t);
        if (elapsed >= s.stateDuration) this.transition("gateOpening");
        break;

      case "gateOpening":
        s.gateOpen = easeInOutCubic(t);
        if (elapsed >= s.stateDuration) this.transition("output");
        break;

      case "output":
        s.gateOpen = 1;
        this.updateKinematicPath(t);
        if (elapsed >= s.stateDuration) this.transition("result");
        break;

      case "result":
        if (elapsed >= s.stateDuration) this.transition("reset");
        break;

      case "reset": {
        const ball = this.getSelectedBall();
        if (ball) {
          ball.kinematic = false;
          ball.vx = (Math.random() - 0.5) * 0.8;
          ball.vy = -1.2;
        }
        s.selectedBallId = null;
        s.selectedNumber = null;
        s.gateOpen = 0;
        if (elapsed >= s.stateDuration) this.transition("idle");
        break;
      }
    }
  }

  startLoop(render: () => void) {
    const loop = (now: number) => {
      this.tick(now);
      render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stopLoop() {
    cancelAnimationFrame(this.rafId);
  }
}
