"use client";

import { useCallback, useRef, useState } from "react";
import type { RaffleData } from "@/components/raffles";

export function RaffleCarousel({
  raffles,
  renderCard,
}: {
  raffles: RaffleData[];
  renderCard: (raffle: RaffleData, index: number) => React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[index] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActiveIndex(index);
  }, []);

  const scrollByDir = useCallback(
    (dir: -1 | 1) => {
      const next = Math.max(0, Math.min(raffles.length - 1, activeIndex + dir));
      scrollTo(next);
    },
    [activeIndex, raffles.length, scrollTo]
  );

  return (
    <div className="imd-fade-in space-y-3">
      <div className="flex items-center justify-between gap-3 imd-type-xs">
        <p className="imd-muted">
          {raffles.length} active drops · swipe or use arrows
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="imd-btn imd-btn-sm"
            onClick={() => scrollByDir(-1)}
            disabled={activeIndex === 0}
            aria-label="previous raffle"
          >
            ←
          </button>
          <button
            type="button"
            className="imd-btn imd-btn-sm"
            onClick={() => scrollByDir(1)}
            disabled={activeIndex >= raffles.length - 1}
            aria-label="next raffle"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="imd-carousel-track flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        onScroll={() => {
          const track = trackRef.current;
          if (!track) return;
          const children = Array.from(track.children) as HTMLElement[];
          const left = track.scrollLeft;
          let closest = 0;
          let minDist = Infinity;
          children.forEach((child, i) => {
            const dist = Math.abs(child.offsetLeft - left);
            if (dist < minDist) {
              minDist = dist;
              closest = i;
            }
          });
          setActiveIndex(closest);
        }}
      >
        {raffles.map((raffle, index) => (
          <div
            key={raffle.id}
            className="imd-carousel-slide w-[min(100%,340px)] shrink-0 snap-start sm:w-[360px]"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {renderCard(raffle, index)}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5">
        {raffles.map((raffle, index) => (
          <button
            key={raffle.id}
            type="button"
            aria-label={`go to raffle ${raffle.id}`}
            onClick={() => scrollTo(index)}
            className={`h-1.5 w-6 border border-black transition-all ${
              index === activeIndex ? "bg-black" : "bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
