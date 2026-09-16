"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import { MACHINE_CONFIG } from "./config";
import { DrawController } from "./controller";
import { renderMachine } from "./renderer";

export type LuckyDrawMachineHandle = {
  /** Trigger a draw programmatically (e.g. from an external button). */
  draw: () => void;
  /** Whether a draw sequence is currently running. */
  isDrawing: () => boolean;
};

export type LuckyDrawMachineProps = {
  /** Hide the built-in draw button (use `ref.draw()` instead). */
  hideButton?: boolean;
  className?: string;
  onDrawComplete?: (number: number) => void;
};

export const LuckyDrawMachine = forwardRef<LuckyDrawMachineHandle, LuckyDrawMachineProps>(
  function LuckyDrawMachine({ hideButton = false, className = "", onDrawComplete }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<DrawController | null>(null);
    const drawingFlagRef = useRef(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastResult, setLastResult] = useState<number | null>(null);
    const [reducedMotion, setReducedMotion] = useState(false);

    const syncDrawingState = useCallback(() => {
      const drawing = controllerRef.current?.snapshot.isDrawing ?? false;
      setIsDrawing(drawing);
    }, []);

    useImperativeHandle(ref, () => ({
      draw: () => {
        controllerRef.current?.startDraw();
        syncDrawingState();
      },
      isDrawing: () => controllerRef.current?.snapshot.isDrawing ?? false,
    }));

    useEffect(() => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const apply = () => setReducedMotion(mq.matches);
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
      canvas.width = MACHINE_CONFIG.width * dpr;
      canvas.height = MACHINE_CONFIG.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const controller = new DrawController((num) => {
        setLastResult(num);
        onDrawComplete?.(num);
        syncDrawingState();
      });
      controller.setReducedMotion(reducedMotion);
      controllerRef.current = controller;

      controller.startLoop(() => {
        renderMachine(ctx, controller.balls, controller.snapshot);
        if (controller.snapshot.isDrawing !== drawingFlagRef.current) {
          drawingFlagRef.current = controller.snapshot.isDrawing;
          setIsDrawing(drawingFlagRef.current);
        }
      });

      return () => controller.stopLoop();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- loop setup once; reducedMotion updates separately
    }, []);

    useEffect(() => {
      controllerRef.current?.setReducedMotion(reducedMotion);
    }, [reducedMotion]);

    const handleDraw = useCallback(() => {
      controllerRef.current?.startDraw();
      syncDrawingState();
    }, [syncDrawingState]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.42;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const intensity = Math.max(0, 1 - dist / 220);
      controllerRef.current?.setHover(intensity);
    }, []);

    const handleMouseLeave = useCallback(() => {
      controllerRef.current?.setHover(0);
    }, []);

    return (
      <section
        className={`imd-lucky-machine ${className}`.trim()}
        aria-label="Mechanical lucky draw machine"
      >
        <div
          ref={containerRef}
          className="imd-lucky-machine-stage"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <canvas
            ref={canvasRef}
            className="imd-lucky-machine-canvas"
            width={MACHINE_CONFIG.width}
            height={MACHINE_CONFIG.height}
            aria-hidden="true"
          />
        </div>

        {!hideButton ? (
          <div className="imd-lucky-machine-controls">
            <button
              type="button"
              className="imd-btn"
              onClick={handleDraw}
              disabled={isDrawing}
              aria-busy={isDrawing}
            >
              {isDrawing ? "DRAWING…" : "LUCKY DRAW"}
            </button>
            {lastResult !== null ? (
              <p className="imd-lucky-machine-result" aria-live="polite">
                ball <strong>{lastResult.toString().padStart(2, "0")}</strong>
              </p>
            ) : (
              <p className="imd-lucky-machine-hint">press to mix and draw</p>
            )}
          </div>
        ) : null}
      </section>
    );
  },
);

export { MACHINE_CONFIG } from "./config";
