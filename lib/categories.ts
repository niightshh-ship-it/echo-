// Предустановленные категории видео. Юзер также может ввести свою через "Other".
export const CATEGORIES = [
  "music",
  "food",
  "sport",
  "art",
  "tech",
  "languages",
  "wellness",
  "crafts",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<Category, string> = {
  music: "🎸",
  food: "🍳",
  sport: "🏋️",
  art: "🎨",
  tech: "💻",
  languages: "🗣️",
  wellness: "🧘",
  crafts: "🔧",
};

// Считаем "своей" категорию, если значение не входит в предустановленный список.
export function isPredefined(value: string | null | undefined): value is Category {
  return !!value && (CATEGORIES as readonly string[]).includes(value);
}
