"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Маркер видео-сообщения в body: [video:<uuid>]
export const VIDEO_MSG_RE = /^\[video:([0-9a-fA-F-]{36})\]$/;

export function parseVideoMessage(body: string): string | null {
  const m = body.trim().match(VIDEO_MSG_RE);
  return m ? m[1] : null;
}

export function VideoMessageCard({
  videoId,
  mine,
}: {
  videoId: string;
  mine: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [skill, setSkill] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("storage_path, skill")
        .eq("id", videoId)
        .maybeSingle();
      if (!data) {
        setMissing(true);
        return;
      }
      const publicUrl = supabase.storage
        .from("videos")
        .getPublicUrl(data.storage_path).data.publicUrl;
      setUrl(publicUrl);
      setSkill(data.skill ?? null);
    })();
  }, [videoId]);

  if (missing) {
    return (
      <div
        className={`rounded-2xl px-3 py-2 text-xs ${
          mine ? "bg-echo/60 text-white/80" : "bg-zinc-800 text-zinc-400"
        }`}
      >
        🎥
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.push(`/v/${videoId}`)}
      className="block w-44 rounded-2xl overflow-hidden border border-white/15 bg-black relative group"
    >
      {url ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={`${url}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            className="w-full aspect-[9/16] object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
            <span className="rounded-full bg-white/25 backdrop-blur-sm p-3">
              <Play className="w-5 h-5 text-white" fill="white" />
            </span>
          </div>
          {skill && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
              <p className="text-white text-[11px] font-medium drop-shadow line-clamp-1">
                🎯 {skill}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="w-full aspect-[9/16] flex items-center justify-center bg-zinc-900">
          <div className="w-6 h-6 border-2 border-white/10 border-t-echo rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
}
