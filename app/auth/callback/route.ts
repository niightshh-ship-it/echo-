import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Этот route вызывается когда юзер кликает на ссылку в письме
// Supabase передаёт ?code=... в URL, мы обмениваем его на сессию
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Проверяем есть ли у юзера профиль
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        // Нет профиля → онбординг, иначе → главная
        return NextResponse.redirect(
          `${origin}${profile ? "/profile" : "/onboarding"}`
        );
      }
    }
  }

  // Что-то пошло не так — на страницу входа с ошибкой
  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
}
