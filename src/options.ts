import type { JustifyOptions } from "./types.js";

export type ShapingLanguage = NonNullable<JustifyOptions["lang"]>;

export const DEFAULT_LANGUAGE: ShapingLanguage = "fa";

export function languageOrDefault(lang: JustifyOptions["lang"]): ShapingLanguage {
  if (lang === undefined) return DEFAULT_LANGUAGE;
  if (lang === "ar" || lang === "fa") return lang;
  throw new TypeError('lang must be either "ar" or "fa"');
}

export function validateOptions(options: JustifyOptions): ShapingLanguage {
  if (!Number.isFinite(options.targetWidth) || options.targetWidth < 0) {
    throw new RangeError("targetWidth must be a finite, nonnegative number");
  }
  if (!options.font.trim()) {
    throw new TypeError("font must be a nonempty CSS font shorthand");
  }
  const language = languageOrDefault(options.lang);
  if (
    options.tolerance !== undefined &&
    (!Number.isFinite(options.tolerance) || options.tolerance < 0)
  ) {
    throw new RangeError("tolerance must be a finite, nonnegative number");
  }
  return language;
}
