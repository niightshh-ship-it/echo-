import { getDictionary } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import { LegalLayout, type Section } from "../(legal)/legal-layout";

const CONTENT: Record<Locale, { pageTitle: string; updated: string; sections: Section[] }> = {
  en: {
    pageTitle: "Privacy Policy",
    updated: "Last updated: May 2026",
    sections: [
      { title: "What we collect", body: "Your email (to sign you in), profile info you provide (name, city, bio, skills), videos you upload, and basic technical data needed to run the service." },
      { title: "How we use it", body: "To operate Echo: show your profile and videos to other users, match you with people based on mutual likes, and let you chat with matches." },
      { title: "Cookies", body: "We use a single cookie to remember your chosen language. No tracking or advertising cookies." },
      { title: "Third parties", body: "Supabase (hosting, auth, database), Brevo (sending sign-in emails), Vercel (web hosting). They process data only to provide their service to us." },
      { title: "Your rights", body: "You can edit your data anytime in Settings, and delete your account permanently — that removes everything: videos, profile, messages, matches." },
      { title: "Changes", body: "We may update this policy. The latest version is always on this page." },
      { title: "Contact", body: "Privacy questions: hello@echo.app" },
    ],
  },
  ru: {
    pageTitle: "Политика конфиденциальности",
    updated: "Обновлено: май 2026",
    sections: [
      { title: "Что мы собираем", body: "Твой email (для входа), данные профиля (имя, город, био, навыки), загруженные тобой видео и базовые технические данные, нужные для работы сервиса." },
      { title: "Как используем", body: "Для работы Echo: показать твой профиль и видео другим, подобрать мэтчи по взаимным лайкам, дать общаться с мэтчами." },
      { title: "Куки", body: "Используем одну куку — она запоминает выбранный язык. Никакой рекламы или слежки." },
      { title: "Третьи стороны", body: "Supabase (хостинг, авторизация, БД), Brevo (отправка писем со входом), Vercel (хостинг сайта). Они обрабатывают данные только чтобы оказывать свою услугу нам." },
      { title: "Твои права", body: "В любой момент можно отредактировать данные через Настройки или удалить аккаунт навсегда — это сотрёт всё: видео, профиль, сообщения, мэтчи." },
      { title: "Изменения", body: "Мы можем обновлять эту политику. Последняя версия всегда тут." },
      { title: "Контакты", body: "По вопросам приватности: hello@echo.app" },
    ],
  },
  nl: {
    pageTitle: "Privacybeleid",
    updated: "Laatst bijgewerkt: mei 2026",
    sections: [
      { title: "Wat we verzamelen", body: "Je e-mail (om in te loggen), profielgegevens die je opgeeft (naam, stad, bio, vaardigheden), video's die je uploadt en basis technische gegevens om de dienst te laten werken." },
      { title: "Hoe we het gebruiken", body: "Om Echo te laten draaien: je profiel en video's tonen aan andere gebruikers, matchen op basis van wederzijdse likes en chatten met matches mogelijk maken." },
      { title: "Cookies", body: "We gebruiken één cookie om je gekozen taal te onthouden. Geen tracking- of advertentiecookies." },
      { title: "Derde partijen", body: "Supabase (hosting, auth, database), Brevo (verzending van inlogmails), Vercel (webhosting). Zij verwerken gegevens alleen om hun dienst aan ons te leveren." },
      { title: "Jouw rechten", body: "Je kunt je gegevens altijd aanpassen in Instellingen, of je account permanent verwijderen — daarmee verdwijnt alles: video's, profiel, berichten, matches." },
      { title: "Wijzigingen", body: "We kunnen dit beleid bijwerken. De laatste versie staat altijd op deze pagina." },
      { title: "Contact", body: "Privacyvragen: hello@echo.app" },
    ],
  },
  uk: {
    pageTitle: "Політика конфіденційності",
    updated: "Оновлено: травень 2026",
    sections: [
      { title: "Що ми збираємо", body: "Твій email (для входу), дані профілю (ім'я, місто, біо, навички), завантажені тобою відео та базові технічні дані, потрібні для роботи сервісу." },
      { title: "Як використовуємо", body: "Щоб Echo працювала: показати твій профіль і відео іншим користувачам, підібрати метчі за взаємними лайками, дати спілкуватися з метчами." },
      { title: "Куки", body: "Використовуємо одну куку — вона запам'ятовує обрану мову. Жодних рекламних або стежачих кук." },
      { title: "Треті сторони", body: "Supabase (хостинг, авторизація, БД), Brevo (надсилання листів зі входом), Vercel (хостинг сайту). Вони обробляють дані лише щоб надавати нам свою послугу." },
      { title: "Твої права", body: "У будь-який момент можна відредагувати дані через Налаштування або видалити акаунт назавжди — це зітре все: відео, профіль, повідомлення, метчі." },
      { title: "Зміни", body: "Ми можемо оновлювати цю політику. Остання версія завжди тут." },
      { title: "Контакти", body: "З питань конфіденційності: hello@echo.app" },
    ],
  },
};

export default async function PrivacyPage() {
  const { locale, dict } = await getDictionary();
  const content = CONTENT[locale];
  return (
    <LegalLayout
      pageTitle={content.pageTitle}
      updated={content.updated}
      sections={content.sections}
      backLabel={dict.nav.back}
    />
  );
}
