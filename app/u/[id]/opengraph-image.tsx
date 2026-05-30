import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const alt = "Echo profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ProfileOG({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, city, skills, avatar_url")
    .eq("id", id)
    .maybeSingle();

  const name = profile?.name ?? "Echo";
  const city = profile?.city ?? "";
  const avatar = profile?.avatar_url ?? null;
  const skills: string[] = profile?.skills ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #050109 0%, #1a0a30 55%, #2a0d4a 100%)",
          color: "white",
          padding: 80,
          fontFamily: "system-ui",
        }}
      >
        {/* Декор — мягкое свечение в углу */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: 9999,
            background: "#7c5cff",
            opacity: 0.18,
            filter: "blur(80px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -160,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: "#e455ff",
            opacity: 0.12,
            filter: "blur(80px)",
            display: "flex",
          }}
        />

        {/* Шапка: аватар + имя + город */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
            position: "relative",
            zIndex: 1,
          }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              width={220}
              height={220}
              style={{
                borderRadius: 9999,
                objectFit: "cover",
                border: "6px solid rgba(255,255,255,0.18)",
              }}
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 9999,
                background: "linear-gradient(135deg, #7c5cff, #e455ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
                fontWeight: 800,
                color: "white",
              }}
            >
              {(name[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
              {name}
            </div>
            {city && (
              <div style={{ fontSize: 36, color: "#b8b8c8", marginTop: 18 }}>
                {city}
              </div>
            )}
          </div>
        </div>

        {/* Низ: скиллы + бренд */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            position: "relative",
            zIndex: 1,
          }}
        >
          {skills.length > 0 && (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {skills.slice(0, 4).map((s) => (
                <div
                  key={s}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 9999,
                    padding: "12px 28px",
                    fontSize: 30,
                    color: "#e0e0ee",
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 16,
            }}
          >
            <div
              style={{
                fontSize: 46,
                fontWeight: 800,
                letterSpacing: -1.5,
                background:
                  "linear-gradient(135deg, #b3a0ff 0%, #7c5cff 45%, #e455ff 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              echo
            </div>
            <div style={{ fontSize: 28, color: "#a0a0b0" }}>
              · trade skills, no money
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
