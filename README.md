# Bekesh

Bekesh is an opinionated ESM-only browser library that fits a line of Persian or Arabic text set in a _naskh_-style font to a target width. It inserts `U+0640 ARABIC TATWEEL` at contextually appropriate elongation points, then returns CSS word spacing for the remaining width.

Bekesh measures the requested font in the browser and verifies its result against DOM layout. Its candidate rules use letter families, positional forms, joined-run length, and explicit _naskh_ prohibitions. If a word has no suitable elongation point, Bekesh leaves that width to word spacing instead of using an arbitrary connection.

## Install

```sh
pnpm add bekesh
```

Or: `npm install bekesh`

## Usage

```ts
import { justifyWithKashida } from "bekesh";

const sourceText = "توانا بود هر که دانا بود";
const font = '32px "Scheherazade New"';
const lang = "fa";
const result = await justifyWithKashida({
  text: sourceText,
  targetWidth: 420,
  font,
  lang,
});

element.textContent = result.displayText;
element.lang = lang;
element.style.font = font;
element.style.wordSpacing = `${result.wordSpacing}px`;
element.style.direction = "rtl";
element.style.whiteSpace = "pre";
```

Pass clean source text on every call. `displayText` contains presentation characters and should not replace the original text in application state. `targetWidth` is a CSS-pixel content width. Make sure to render with the same language, font, and RTL direction used for measurement! `white-space: pre` preserves spaces and keeps the text on one line.

An existing bare `U+0640` is treated as an author-selected elongation point and receives the highest candidate priority. A _tatweel_ carrying a combining mark remains a mark seat and is not treated as an elongation signal.

`justifyWithKashida()` waits for the requested font through the CSS Font Loading API. It uses Canvas for candidate search, verifies the fitted text and word spacing in a hidden DOM element, and backs off when the browser's inline layout would exceed the target.

## API

```ts
function justifyWithKashida(options: JustifyOptions): Promise<JustificationResult>;
```

`JustifyOptions` contains:

- `text`: clean source text; it is not mutated or normalized
- `targetWidth`: desired inline width in CSS pixels
- `font`: a valid CSS `font` shorthand, including the font size
- `lang`: optional shaping language, `"fa"` (default) or `"ar"`
- `tolerance`: optional permitted overshoot in CSS pixels; defaults to zero

The result includes the source and display strings, measured widths, width remaining after *tatweel*s, per-space `wordSpacing`, inserted _tatweel_ edits, and diagnostic strings. If the clean source text already exceeds the target width, Bekesh returns it unchanged with the `source-overflows-target` diagnostic.

`diagnostics` contains values from the exported `JustificationDiagnostic` type:

- `source-overflows-target`: the clean source is already too wide and is returned unchanged
- `no-adjustable-spaces`: residual width remains, but the source contains no `U+0020` spaces to which word spacing can be applied
- `iteration-safety-limit-reached`: the pure solver reached its bounded iteration limit
- `dom-verification-adjusted`: DOM verification reduced the Canvas-selected *tatweel*s or word spacing
- `dom-verification-fallback`: bounded DOM refitting could not find a verified edited result, so the fitting step fell back to clean source text

The package also exports `measureDomText(text, font, lang?)` for synchronous DOM measurement, plus the `JustifyOptions`, `JustificationResult`, `JustificationDiagnostic`, and `TatweelEdit` types. Language defaults to `"fa"`. `measureDomText()` does not load fonts; wait for the relevant face before calling this function when the font may not be ready:

```ts
await document.fonts.load(font, text);
const width = measureDomText(text, font, "ar");
```

## Browser and layout requirements

Bekesh requires a modern browser with ES modules, the DOM, Canvas 2D, `document.fonts`, and `Intl.Segmenter` support. It has no runtime dependencies.

Measurement currently models the CSS `font` shorthand, the selected language, RTL direction, and returned word spacing. Font features, variation settings, letter spacing, transforms, fallback selection, and other shaping inputs are not API options. If those differ between measurement and rendering, the final element can have a different width. Padding and borders are likewise outside `targetWidth`.

Bekesh fits one line at a time. It does not break paragraphs into lines, shrink overlong source text, or implement calligraphic glyph elongation. Bekesh sets the measurement language to Persian or Arabic and the direction to RTL; the browser handles bidi, shaping, and font fallback. This library's rules are designed for Persian and Arabic text in _naskh_-style fonts, not as a universal Arabic-script justification model. Candidate choice remains heuristic, so please review it with the fonts and texts that your application supports.

## Research and prior art

This repository also maintains the research that informed the implementation:

- [Research synthesis](https://github.com/theodore-s-beers/bekesh/blob/main/docs/research-synthesis.md) – the original survey and proposed architecture
- [Prior-art catalog](https://github.com/theodore-s-beers/bekesh/blob/main/docs/catalog.md) – a map of projects and standards
- [Implementation comparison](https://github.com/theodore-s-beers/bekesh/blob/main/docs/comparison.md) – responsibilities and tradeoffs side by side
- [Source notes](https://github.com/theodore-s-beers/bekesh/blob/main/docs/sources/README.md) – notes tied to specific revisions
- [Regression corpus](https://github.com/theodore-s-beers/bekesh/blob/main/corpus/README.md) and [`cases.json`](https://github.com/theodore-s-beers/bekesh/blob/main/corpus/cases.json) – test categories and starter cases

Research notes prefer primary sources and pin code observations to revisions where possible. `U+0640` output is treated as a reversible presentation artifact, not source text.

## Development

```sh
pnpm install
pnpm check
pnpm test:browser
```

`test:browser` is an opt-in integration suite. It expects a system Playwright installation with Chromium, Firefox, and WebKit, and downloads a pinned Scheherazade New font into the operating system's temporary directory. The normal test and check commands do not require Playwright or network access.

One way to provide the system browser tooling is:

```sh
volta install playwright
playwright install chromium firefox webkit
```

If Playwright is installed elsewhere, set `BEKESH_PLAYWRIGHT_PATH` to its package directory.

## License

Bekesh is available under the [MIT License](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for the provenance and terms of the compact Unicode joining-property data.
