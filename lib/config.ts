// Единая точка для контактных данных и неизменяемых настроек.
// Сейчас все письма идут на личный gmail основателя.
// Когда появится свой домен — заведи hello@домен и privacy@домен и поменяй здесь.
export const CONTACT_EMAIL = "smartwoter@gmail.com";
export const LEGAL_EMAIL = "smartwoter@gmail.com";

// Соцсети — ники разные на разных платформах потому что что-то было занято.
// Если когда-нибудь решишь унифицировать — меняй только здесь.
export const SOCIAL = {
  threads: "https://www.threads.com/@echo.globalapp",
  tiktok: "https://www.tiktok.com/@echo.global.app",
  instagram: "https://www.instagram.com/echoo.globalapp/",
  telegram: "https://t.me/solvipay",
} as const;

// Обратная связь — простой mailto, потом можно поменять на форму
export const FEEDBACK_EMAIL = "smartwoter@gmail.com";
