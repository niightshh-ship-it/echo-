import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatClient, type Message } from "./chat-client";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ otherId: string }>;
}) {
  const { otherId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Сортированная пара (как в matches)
  const [a, b] = user.id < otherId ? [user.id, otherId] : [otherId, user.id];

  // Проверяем что мэтч реально существует — иначе чат недоступен
  const { data: match } = await supabase
    .from("matches")
    .select("user_a")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();

  if (!match) notFound();

  // Профиль собеседника
  const { data: other } = await supabase
    .from("profiles")
    .select("id, name, city")
    .eq("id", otherId)
    .single();

  if (!other) notFound();

  // История сообщений
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("match_user_a", a)
    .eq("match_user_b", b)
    .order("created_at", { ascending: true });

  return (
    <ChatClient
      me={user.id}
      pairA={a}
      pairB={b}
      other={other}
      initialMessages={(messages ?? []) as Message[]}
    />
  );
}
