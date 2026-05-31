// Единая точка для контактных данных и неизменяемых настроек.
// Когда появится домен и почта на нём — поменять здесь, и подтянется везде.
export const CONTACT_EMAIL = "hello@echo.app";
export const LEGAL_EMAIL = "privacy@echo.app";

// Соцсети — ник одинаковый на всех платформах
export const SOCIAL = {
  threads: "https://www.threads.com/@echo.global.app",
  tiktok: "https://www.tiktok.com/@echo.global.app",
  instagram: "https://www.instagram.com/echo.global.app",
  telegram: "https://t.me/echo_global_app",
} as const;

// Обратная связь — простой mailto, потом можно поменять на форму
export const FEEDBACK_EMAIL = "feedback@echo.app";
