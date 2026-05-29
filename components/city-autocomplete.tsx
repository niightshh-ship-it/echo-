"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin } from "lucide-react";
import { WORLD_CITIES } from "@/lib/world-cities";
import { Input } from "@/components/ui/input";

export function CityAutocomplete({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightFromFocus, setFocus] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const q = value.trim().toLowerCase();
  const suggestions =
    q.length >= 1 && highlightFromFocus
      ? WORLD_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 6)
      : [];

  return (
    <div ref={ref} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 z-10" />
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setFocus(true);
        }}
        onFocus={() => {
          setOpen(true);
          setFocus(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={`pl-9 ${className}`}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur p-1 shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
