"use client";

import { useEffect, useRef } from "react";

const RING_ART = `        . · · · · · · · · · · · · · · · .
     ·                                     ·
   ·                                         ·
  ·                                           ·
   ·                                         ·
     ·                                     ·
        . · · · · · · · · · · · · · · · .`;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  settled: boolean;
  escape: boolean;
};

export function BowlAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    const particles: Particle[] = [];
    const settled: Particle[] = [];
    const maxSettled = 120;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const spawn = (w: number) => {
      particles.push({
        x: w * 0.25 + Math.random() * w * 0.5,
        y: -4,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.8 + Math.random() * 0.8,
        r: 1.2 + Math.random() * 1.4,
        settled: false,
        escape: false,
      });
    };

    const tick = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h * 0.58;
      const rx = Math.min(w * 0.18, 110);
      const ry = Math.min(h * 0.12, 48);

      ctx.clearRect(0, 0, w, h);

      if (frame % 4 === 0 && particles.length < 40) spawn(w);

      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - rx, cy);
      ctx.lineTo(cx + rx, cy);
      ctx.stroke();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p.settled) {
          p.vy += 0.05;
          p.x += p.vx;
          p.y += p.vy;

          const bowlSurface =
            cy - ry * Math.sqrt(Math.max(0, 1 - ((p.x - cx) / rx) ** 2));

          if (p.y + p.r >= bowlSurface && Math.abs(p.x - cx) < rx * 0.95) {
            p.y = bowlSurface - p.r;
            p.vy *= -0.25;
            p.vx *= 0.7;
            if (Math.abs(p.vy) < 0.35) {
              p.settled = true;
              p.vy = 0;
              p.vx = 0;
              settled.push({ ...p });
              particles.splice(i, 1);
              if (settled.length > maxSettled) settled.shift();
              continue;
            }
          }
        }

        if (p.y > h + 10) particles.splice(i, 1);
      }

      if (settled.length > maxSettled * 0.75 && frame % 30 === 0 && settled.length > 0) {
        const idx = Math.floor(Math.random() * settled.length);
        const out = settled.splice(idx, 1)[0];
        particles.push({
          ...out,
          settled: false,
          escape: true,
          vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random()),
          vy: -1.5 - Math.random(),
        });
      }

      for (const p of [...settled, ...particles]) {
        ctx.fillStyle = p.escape ? "#888" : "#000";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame++;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="imd-bowl-stage" aria-hidden="true">
      <div className="imd-rings">
        {[0, 1, 2, 3].map((i) => (
          <pre key={i} className="imd-ring">
            {RING_ART}
          </pre>
        ))}
        <pre className="imd-core">{`   █████
  ███████
   █████`}</pre>
      </div>
      <canvas ref={canvasRef} className="imd-bowl-canvas" />
      <div className="imd-hero-fade-top" />
      <div className="imd-hero-fade-bottom" />
    </div>
  );
}
