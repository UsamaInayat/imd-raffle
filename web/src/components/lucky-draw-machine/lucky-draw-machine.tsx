"use client";

import { useEffect, useRef } from "react";
import { BOWL_CONFIG } from "./config";
import {
  createBalls,
  createSimulationState,
  settleBallsForStatic,
  stepSimulation,
} from "./physics";
import { renderDrum, renderStatic } from "./renderer";
import type { Ball } from "./types";

export type LuckyDrawMachineProps = {
  className?: string;
};

/** Minimalist monochrome lottery ball drum — canvas physics, no UI. */
export function LuckyDrawMachine({ className = "" }: LuckyDrawMachineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<Ball[]>(createBalls());
  const simRef = useRef(createSimulationState(performance.now()));
  const reducedRef = useRef(false);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const staticSettledRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedRef.current = mq.matches;
      if (mq.matches && !staticSettledRef.current) {
        settleBallsForStatic(ballsRef.current);
        staticSettledRef.current = true;
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

    const resize = () => {
      const maxW = Math.min(560, wrap.clientWidth || BOWL_CONFIG.width);
      const scale = maxW / BOWL_CONFIG.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = BOWL_CONFIG.width * dpr * scale;
      canvas.height = BOWL_CONFIG.height * dpr * scale;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastFrameRef.current || 16);
      lastFrameRef.current = now;

      if (reducedRef.current) {
        renderStatic(ctx, ballsRef.current, simRef.current.mixerAngle);
      } else {
        stepSimulation(ballsRef.current, simRef.current, dt, now, false);
        renderDrum(ctx, ballsRef.current, simRef.current.mixerAngle);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`imd-bowl-jar ${className}`.trim()}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="imd-bowl-jar-canvas"
        width={BOWL_CONFIG.width}
        height={BOWL_CONFIG.height}
      />
    </div>
  );
}

export { BOWL_CONFIG as MACHINE_CONFIG } from "./config";
