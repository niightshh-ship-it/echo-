import en, { type Dictionary } from "./dictionaries/en";
import ru from "./dictionaries/ru";
import nl from "./dictionaries/nl";
import uk from "./dictionaries/uk";
import type { Locale } from "./config";

export const dictionaries: Record<Locale, Dictionary> = { en, ru, nl, uk };
export type { Dictionary };
