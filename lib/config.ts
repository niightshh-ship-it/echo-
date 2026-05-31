// Единая точка для контактных данных и неизменяемых настроек.
// Когда появится домен и почта на нём — поменять здесь, и подтянется везде.
export const CONTACT_EMAIL = "hello@echo.app";
export const LEGAL_EMAIL = "privacy@echo.app";

// Соцсети — ники разные на разных платформах потому что что-то было занято.
// Если когда-нибудь решишь унифицировать — меняй только здесь.
export const SOCIAL = {
  threads: "https://www.threads.com/@echo.globalapp",
  tiktok: "https://www.tiktok.com/@echo.global.app",
  instagram: "https://www.instagram.com/echoo.globalapp/",
  telegram: "https://t.me/solvipay",
} as const;

// Обратная связь — простой mailto, потом можно поменять на форму
export const FEEDBACK_EMAIL = "feedback@echo.app";
