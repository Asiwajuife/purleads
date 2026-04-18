"use client";
import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
  phase: number;
  phaseSpeed: number;
  bright: boolean;
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    // Use typed aliases so closures don't see possibly-null types
    const canvas: HTMLCanvasElement = el;
    const c: CanvasRenderingContext2D = ctx;

    let rafId: number;
    let stars: Star[] = [];

    function init() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      const density = Math.floor((canvas.width * canvas.height) / 2800);
      stars = Array.from({ length: Math.max(density, 80) }, () => {
        const bright = Math.random() < 0.08;
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: bright ? Math.random() * 2.2 + 1.2 : Math.random() * 1.3 + 0.2,
          speed: bright ? Math.random() * 0.25 + 0.08 : Math.random() * 0.12 + 0.02,
          opacity: Math.random() * 0.5 + (bright ? 0.5 : 0.25),
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: Math.random() * 0.025 + (bright ? 0.012 : 0.004),
          bright,
        };
      });
    }

    function draw() {
      c.fillStyle = "#06041a";
      c.fillRect(0, 0, canvas.width, canvas.height);

      const nebula = c.createRadialGradient(
        canvas.width * 0.75, canvas.height * 0.25, 0,
        canvas.width * 0.75, canvas.height * 0.25, canvas.width * 0.4,
      );
      nebula.addColorStop(0, "rgba(80, 40, 160, 0.07)");
      nebula.addColorStop(0.5, "rgba(50, 20, 120, 0.04)");
      nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
      c.fillStyle = nebula;
      c.fillRect(0, 0, canvas.width, canvas.height);

      for (const star of stars) {
        star.phase += star.phaseSpeed;
        star.y += star.speed;
        if (star.y > canvas.height + 2) {
          star.y = -2;
          star.x = Math.random() * canvas.width;
        }

        const twinkle = 0.55 + 0.45 * Math.sin(star.phase);
        const a = star.opacity * twinkle;

        if (star.bright) {
          const glow = c.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 5);
          glow.addColorStop(0, `rgba(200, 185, 255, ${a * 0.55})`);
          glow.addColorStop(0.4, `rgba(160, 140, 255, ${a * 0.2})`);
          glow.addColorStop(1, "rgba(140, 120, 255, 0)");
          c.beginPath();
          c.arc(star.x, star.y, star.radius * 5, 0, Math.PI * 2);
          c.fillStyle = glow;
          c.fill();
        }

        c.beginPath();
        c.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        c.fillStyle = star.bright
          ? `rgba(230, 220, 255, ${a})`
          : `rgba(210, 205, 255, ${a})`;
        c.fill();
      }

      rafId = requestAnimationFrame(draw);
    }

    init();
    draw();

    const ro = new ResizeObserver(init);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ display: "block" }}
    />
  );
}
