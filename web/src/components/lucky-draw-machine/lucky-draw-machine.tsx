"use client";

import { useEffect, useRef } from "react";
import { BOWL_CONFIG } from "./config";
import { createBalls, stepSimulation } from "./physics";
import { renderBowl, renderStatic } from "./renderer";
import type { Ball } from "./types";

export type LuckyDrawMachineProps = {
  className?: string;
};

/** Minimalist monochrome glass bowl — continuous looping ball physics. */
export function LuckyDrawMachine({ className = "" }: LuckyDrawMachineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>(createBalls());
  const reducedRef = useRef(false);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedRef.current = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = BOWL_CONFIG.width * dpr;
    canvas.height = BOWL_CONFIG.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastFrameRef.current || 16);
      lastFrameRef.current = now;

      if (reducedRef.current) {
        renderStatic(ctx, ballsRef.current);
      } else {
        stepSimulation(ballsRef.current, dt, now, false);
        renderBowl(ctx, ballsRef.current);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
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
