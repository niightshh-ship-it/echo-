import { getDictionary } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import { LegalLayout, type Section } from "../(legal)/legal-layout";

const CONTENT: Record<Locale, { pageTitle: string; updated: string; sections: Section[] }> = {
  en: {
    pageTitle: "Terms of Service",
    updated: "Last updated: May 2026",
    sections: [
      { title: "The service", body: "Echo is a skill-exchange social network. Use it to share videos of your skills, connect with people, and exchange skills without money." },
      { title: "Account", body: "Keep your login secure. You're responsible for everything that happens under your account. You must be 16 or older to use Echo." },
      { title: "Your content", body: "You own the content you post. By uploading, you grant Echo a non-exclusive license to display it inside the app to other users." },
      { title: "Prohibited", body: "No illegal content, harassment, hate speech, spam, fake profiles, or sharing of personal information without consent. We may remove content or accounts that break these rules." },
      { title: "Termination", body: "You can delete your account anytime in Settings. We may suspend or terminate accounts that violate these terms." },
      { title: "No warranty", body: "Echo is provided \"as is\", without warranties. We don't guarantee uninterrupted or error-free service." },
      { title: "Liability", body: "To the extent allowed by law, Echo isn't liable for indirect, incidental or consequential damages." },
      { title: "Changes", body: "We may update these terms. The latest version is always on this page." },
      { title: "Contact", body: "Questions: hello@echo.app" },
    ],
  },
  ru: {
    pageTitle: "Условия использования",
    updated: "Обновлено: май 2026",
    sections: [
      { title: "Сервис", body: "Echo — соцсеть для обмена навыками. Используй её, чтобы выкладывать видео своих навыков, знакомиться с людьми и обмениваться навыками без денег." },
      { title: "Аккаунт", body: "Береги логин. Ты отвечаешь за всё, что происходит под твоим аккаунтом. Использовать Echo можно с 16 лет." },
      { title: "Твой контент", body: "Ты владеешь контентом, который выкладываешь. Загружая, ты даёшь Echo неисключительную лицензию показывать это в приложении другим юзерам." },
      { title: "Запрещено", body: "Никакого незаконного контента, домогательств, разжигания ненависти, спама, фейковых профилей и публикации чужих личных данных без согласия. Мы можем удалять контент или аккаунты за нарушения." },
      { title: "Прекращение", body: "Можешь удалить аккаунт в любой момент через Настройки. Мы можем приостановить или закрыть аккаунты, нарушающие эти условия." },
      { title: "Без гарантий", body: "Echo предоставляется «как есть», без гарантий. Мы не гарантируем бесперебойную работу или отсутствие ошибок." },
      { title: "Ответственность", body: "В рамках, разрешённых законом, Echo не несёт ответственности за косвенный, случайный или последующий ущерб." },
      { title: "Изменения", body: "Мы можем обновлять эти условия. Последняя версия всегда тут." },
      { title: "Контакты", body: "Вопросы: hello@echo.app" },
    ],
  },
  nl: {
    pageTitle: "Gebruiksvoorwaarden",
    updated: "Laatst bijgewerkt: mei 2026",
    sections: [
      { title: "De dienst", body: "Echo is een sociaal netwerk voor het ruilen van vaardigheden. Deel video's van je vaardigheden, leer mensen kennen en ruil vaardigheden zonder geld." },
      { title: "Account", body: "Bewaar je inloggegevens veilig. Je bent verantwoordelijk voor alles wat onder jouw account gebeurt. Je moet 16 jaar of ouder zijn om Echo te gebruiken." },
      { title: "Jouw inhoud", body: "Je bezit de inhoud die je plaatst. Door te uploaden geef je Echo een niet-exclusieve licentie om het binnen de app aan andere gebruikers te tonen." },
      { title: "Verboden", body: "Geen illegale inhoud, intimidatie, haatzaaiende uitingen, spam, nepprofielen of het delen van persoonlijke informatie zonder toestemming. We kunnen inhoud of accounts verwijderen die deze regels overtreden." },
      { title: "Beëindiging", body: "Je kunt je account altijd verwijderen in Instellingen. We kunnen accounts opschorten of verwijderen die deze voorwaarden schenden." },
      { title: "Geen garantie", body: "Echo wordt geleverd \"zoals het is\", zonder garanties. We garanderen geen ononderbroken of foutloze service." },
      { title: "Aansprakelijkheid", body: "Voor zover wettelijk toegestaan, is Echo niet aansprakelijk voor indirecte, incidentele of gevolgschade." },
      { title: "Wijzigingen", body: "We kunnen deze voorwaarden bijwerken. De laatste versie staat altijd op deze pagina." },
      { title: "Contact", body: "Vragen: hello@echo.app" },
    ],
  },
  uk: {
    pageTitle: "Умови використання",
    updated: "Оновлено: травень 2026",
    sections: [
      { title: "Сервіс", body: "Echo — соцмережа для обміну навичками. Використовуй її, щоб ділитися відео своїх навичок, знайомитися з людьми та обмінюватися навичками без грошей." },
      { title: "Акаунт", body: "Бережи логін. Ти відповідаєш за все, що відбувається під твоїм акаунтом. Використовувати Echo можна з 16 років." },
      { title: "Твій контент", body: "Ти володієш контентом, який публікуєш. Завантажуючи, ти даєш Echo невиключну ліцензію показувати це у застосунку іншим користувачам." },
      { title: "Заборонено", body: "Жодного незаконного контенту, домагань, мови ворожнечі, спаму, фейкових профілів чи публікації чужих особистих даних без згоди. Ми можемо видаляти контент або акаунти за порушення." },
      { title: "Припинення", body: "Можеш видалити акаунт у будь-який момент через Налаштування. Ми можемо призупинити або закрити акаунти, що порушують ці умови." },
      { title: "Без гарантій", body: "Echo надається \"як є\", без гарантій. Ми не гарантуємо безперервної або безпомилкової роботи." },
      { title: "Відповідальність", body: "У межах, дозволених законом, Echo не несе відповідальності за непрямі, випадкові чи наслідкові збитки." },
      { title: "Зміни", body: "Ми можемо оновлювати ці умови. Остання версія завжди тут." },
      { title: "Контакти", body: "Питання: hello@echo.app" },
    ],
  },
};

export default async function TermsPage() {
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
