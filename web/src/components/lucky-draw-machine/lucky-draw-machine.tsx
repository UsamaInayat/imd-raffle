"use client";

import { useEffect, useRef } from "react";
import { BOWL_CONFIG } from "./config";
import {
  applyJarClick,
  createBalls,
  createSimulationState,
  isPointInDrum,
  settleBallsForStatic,
  stepSimulation,
  settlePackedBalls,
} from "./physics";
import { renderDrum, renderStatic } from "./renderer";
import type { Ball, SimulationState } from "./types";

export type LuckyDrawMachineProps = {
  className?: string;
};

function clientToSim(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * BOWL_CONFIG.width,
    y: ((clientY - rect.top) / rect.height) * BOWL_CONFIG.height,
  };
}

/** Premium monochrome lottery ball drum — canvas physics centerpiece. */
export function LuckyDrawMachine({ className = "" }: LuckyDrawMachineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const simRef = useRef<SimulationState | null>(null);
  const reducedRef = useRef(false);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const readyRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedRef.current = mq.matches;
      if (mq.matches && ballsRef.current.length > 0) {
        settleBallsForStatic(ballsRef.current);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!readyRef.current) {
      const now = performance.now();
      const balls = createBalls();
      const sim = createSimulationState(now);
      settlePackedBalls(balls);
      if (reducedRef.current) {
        settleBallsForStatic(balls);
      }
      ballsRef.current = balls;
      simRef.current = sim;
      readyRef.current = true;
    }

    const resize = () => {
      const maxW = Math.min(680, wrap.clientWidth || BOWL_CONFIG.width);
      const scale = maxW / BOWL_CONFIG.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = BOWL_CONFIG.width * dpr * scale;
      canvas.height = BOWL_CONFIG.height * dpr * scale;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    };

    let stirring = false;
    let lastStirMs = 0;

    const stirAt = (event: PointerEvent, intensity = 1) => {
      if (reducedRef.current) return;
      const sim = simRef.current;
      const balls = ballsRef.current;
      if (!sim || balls.length === 0) return;

      const { x, y } = clientToSim(canvas, event.clientX, event.clientY);
      if (!isPointInDrum(x, y)) return;

      applyJarClick(balls, sim, x, y, performance.now(), intensity);
    };

    const onPointerDown = (event: PointerEvent) => {
      stirring = true;
      canvas.setPointerCapture(event.pointerId);
      stirAt(event, 1);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!stirring) return;
      const t = performance.now();
      if (t - lastStirMs < 36) return;
      lastStirMs = t;
      stirAt(event, BOWL_CONFIG.interaction.dragBoostScale);
    };

    const endStir = (event: PointerEvent) => {
      stirring = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endStir);
    canvas.addEventListener("pointercancel", endStir);

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastFrameRef.current || 16);
      lastFrameRef.current = now;
      const balls = ballsRef.current;
      const sim = simRef.current;
      if (!sim || balls.length === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (reducedRef.current) {
        renderStatic(ctx, balls);
      } else {
        stepSimulation(balls, sim, dt, now, false);
        renderDrum(ctx, balls);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endStir);
      canvas.removeEventListener("pointercancel", endStir);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`imd-bowl-jar ${className}`.trim()}
    >
      <canvas
        ref={canvasRef}
        className="imd-bowl-jar-canvas"
        width={BOWL_CONFIG.width}
        height={BOWL_CONFIG.height}
        aria-label="Interactive lottery ball drum — click inside to stir"
      />
    </div>
  );
}

export { BOWL_CONFIG as MACHINE_CONFIG } from "./config";
