"use client";

import { useEffect, useRef } from "react";

// Свечение, следующее за курсором по всей странице.
// position: fixed → держится у курсора независимо от скролла, ничем не обрезается.
// Только десктоп (на тач-устройствах курсора нет).
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] hidden md:block"
      style={{
        // mix-blend-screen — свечение «осветляет» тёмный фон, но не трогает
        // белый текст, поэтому фонарь виден поверх bg-black любой страницы.
        mixBlendMode: "screen",
        background:
          "radial-gradient(460px circle at var(--mx, 50%) var(--my, 50%), rgba(124,92,255,0.14), rgba(228,85,255,0.05) 45%, transparent 70%)",
      }}
    />
  );
}
