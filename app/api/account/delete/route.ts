// Полное удаление аккаунта (GDPR): сносит файлы из storage и юзера из auth.
// FK с on delete cascade сделают остальную работу.

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

async function emptyFolder(admin: SupabaseClient, bucket: string, prefix: string) {
  const { data } = await admin.storage.from(bucket).list(prefix);
  if (!data || data.length === 0) return;
  const paths = data.map((f) => `${prefix}/${f.name}`);
  await admin.storage.from(bucket).remove(paths);
}

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Стираем файлы — параллельно, ошибки игнорим (если папки нет — ок)
  await Promise.allSettled([
    emptyFolder(admin, "videos", user.id),
    emptyFolder(admin, "avatars", user.id),
    emptyFolder(admin, "verifications", user.id),
  ]);

  // Удаляем юзера — каскад снесёт profile и связанные таблицы
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
