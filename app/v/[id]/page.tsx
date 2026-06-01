import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { SharedVideoClient } from "./shared-video-client";

// Метаданные → OG-картинку (опционально, можно автору позже сделать)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("videos")
    .select("description, skill, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!video) return { title: "Echo" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, city")
    .eq("id", video.user_id)
    .maybeSingle();

  const authorName = profile?.name ?? "Echo";
  const title = video.skill
    ? `${authorName} · ${video.skill}`
    : `${authorName} on Echo`;
  const description =
    video.description?.trim() ||
    `${authorName} ${profile?.city ? `in ${profile.city}` : ""} on Echo — trade skills, no money.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function VideoSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: video } = await supabase
    .from("videos")
    .select("id, user_id, skill, description, storage_path, is_random, views_count")
    .eq("id", id)
    .maybeSingle();
  if (!video) notFound();

  // Свой видос — открываем твой профиль (проще управление)
  if (user && video.user_id === user.id) redirect("/profile");

  const { data: author } = await supabase
    .from("profiles")
    .select("id, name, city, avatar_url")
    .eq("id", video.user_id)
    .maybeSingle();
  if (!author) notFound();

  const videoUrl = supabase.storage
    .from("videos")
    .getPublicUrl(video.storage_path).data.publicUrl;

  // Счётчики
  const [{ count: likeCount }, { count: commentCount }] = await Promise.all([
    supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("video_id", video.id),
    video.is_random
      ? supabase
          .from("video_comments")
          .select("*", { count: "exact", head: true })
          .eq("video_id", video.id)
      : Promise.resolve({ count: 0 as number | null }),
  ]);

  // Текущий пользователь — лайкал ли он
  let liked = false;
  if (user) {
    const { data } = await supabase
      .from("likes")
      .select("video_id")
      .eq("video_id", video.id)
      .eq("liker_id", user.id)
      .maybeSingle();
    liked = !!data;
  }

  const { dict: t } = await getDictionary();

  return (
    <SharedVideoClient
      videoId={video.id}
      videoUrl={videoUrl}
      skill={video.skill ?? null}
      description={video.description ?? null}
      isRandom={!!video.is_random}
      viewsCount={video.views_count ?? 0}
      author={{
        id: author.id,
        name: author.name,
        city: author.city,
        avatar: author.avatar_url ?? null,
      }}
      currentUserId={user?.id ?? null}
      initialLiked={liked}
      initialLikeCount={likeCount ?? 0}
      initialCommentCount={commentCount ?? 0}
      guestTitle={t.shareVideo.guestTitle.replace("{name}", author.name)}
      guestText={t.shareVideo.guestText}
      guestCta={t.shareVideo.guestCta}
      backLabel={t.nav.back}
    />
  );
}
