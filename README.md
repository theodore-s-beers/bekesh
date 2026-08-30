# Bekesh

Bekesh is an ESM-only browser library for fitting Persian and Arabic-script
text to a target width. It inserts U+0640 ARABIC TATWEEL at heuristic
elongation points, then returns CSS word spacing for any width that remains.

Bekesh measures the requested font in the browser and verifies its result
against DOM layout. It is currently an early 0.x library focused on Persian
text in Naskh-style fonts.

## Install

```sh
pnpm add bekesh
```

Or use `npm install bekesh`.

## Usage

```ts
import { justifyWithKashida } from "bekesh";

const sourceText = "توانا بود هر که دانا بود";
const font = '32px "Scheherazade New"';
const result = await justifyWithKashida({
  text: sourceText,
  targetWidth: 420,
  font,
});

element.textContent = result.displayText;
element.style.font = font;
element.style.wordSpacing = `${result.wordSpacing}px`;
element.style.direction = "rtl";
element.style.whiteSpace = "nowrap";
```

Pass clean source text on every call. `displayText` contains presentation
characters and should not replace the original text in application state.
`targetWidth` is a CSS-pixel content width. The element must use the same font
and other typographic settings used for measurement.

`justifyWithKashida()` waits for the requested font through the CSS Font Loading
API. It uses Canvas for candidate search, verifies the fitted text and word
spacing in a hidden DOM element, and backs off when the browser's inline layout
would exceed the target.

## API

```ts
function justifyWithKashida(
  options: JustifyOptions,
  candidateEngine?: CandidateEngine,
): Promise<JustificationResult>;
```

`JustifyOptions` contains:

- `text`: clean source text; it is not mutated or normalized.
- `targetWidth`: desired inline width in CSS pixels.
- `font`: a valid CSS `font` shorthand, including the font size.
- `tolerance`: optional permitted overshoot in CSS pixels; defaults to zero.

The result includes the source and display strings, measured widths, residual
width, per-space `wordSpacing`, inserted tatweel edits, and diagnostic strings.
If the clean source already exceeds the target, Bekesh returns it unchanged
with the `source-overflows-target` diagnostic.

`diagnostics` contains values from the exported `JustificationDiagnostic` type:

- `source-overflows-target`: the clean source is already too wide and is
  returned unchanged.
- `no-adjustable-spaces`: residual width remains, but the source contains no
  U+0020 spaces to which word spacing can be applied.
- `iteration-safety-limit-reached`: the pure solver reached its bounded
  iteration limit.
- `dom-verification-adjusted`: DOM verification reduced the Canvas-selected
  tatweels or word spacing.
- `dom-verification-fallback`: bounded DOM refitting could not find a verified
  edited result, so the fitting step fell back to clean source text.

The package also exports:

- `measureDomText(text, font)` for the natural DOM-rendered width of clean text.
- `fitWithKashida()` for deterministic use with an injected text measurer.
- `findPersianNaskhCandidates()` and `persianNaskhCandidateEngine`.
- `canvasTextMeasurer`.
- TypeScript types for options, results, candidates, edits, engines, and
  measurers, including `JustificationDiagnostic`.

`measureDomText()` is synchronous and does not load fonts. Wait for the font
before measuring when it may not be ready:

```ts
await document.fonts.load(font, sourceText);
const sourceWidth = measureDomText(sourceText, font);
```

## Browser and layout requirements

Bekesh requires a modern browser with ES modules, the DOM, Canvas 2D,
`document.fonts`, and `Intl.Segmenter` support. It has no runtime dependencies.

Measurement currently models the CSS `font` shorthand, direction, and returned
word spacing. Font features, variation settings, language, letter spacing,
transforms, fallback selection, and other shaping inputs are not API options.
If those differ between measurement and rendering, the final element can have
a different width. Padding and borders are likewise outside `targetWidth`.

The default candidate engine handles one resolved Persian/Arabic-script line.
It does not perform paragraph line breaking, bidi resolution, font fallback,
shrinking, or calligraphic glyph elongation. Candidate choice is heuristic and
should be visually reviewed with the fonts and texts an application supports.

## Research and prior art

The repository also maintains the research that informed the implementation:

- [Research synthesis](https://github.com/theodore-s-beers/bekesh/blob/main/docs/research-synthesis.md)
  — the original survey and proposed architecture
- [Prior-art catalog](https://github.com/theodore-s-beers/bekesh/blob/main/docs/catalog.md)
  — a map of projects and standards
- [Implementation comparison](https://github.com/theodore-s-beers/bekesh/blob/main/docs/comparison.md)
  — responsibilities and tradeoffs side by side
- [Source notes](https://github.com/theodore-s-beers/bekesh/blob/main/docs/sources/README.md)
  — notes tied to specific revisions
- [Regression corpus](https://github.com/theodore-s-beers/bekesh/blob/main/corpus/README.md)
  and
  [`cases.json`](https://github.com/theodore-s-beers/bekesh/blob/main/corpus/cases.json)
  — test categories and starter cases

Research notes prefer primary sources and pin code observations to revisions
where possible. U+0640 output is treated as a reversible presentation artifact,
not source text.

## Development

```sh
pnpm install
pnpm check
pnpm test:browser
```

`test:browser` is an opt-in integration suite. It expects a system Playwright
installation with Chromium and Firefox, and downloads a pinned Scheherazade New
font into the operating system's temporary directory. The normal test and
check commands do not require Playwright or network access.

One way to provide the system browser tooling is:

```sh
volta install playwright
playwright install chromium firefox
```

If Playwright is installed elsewhere, set `BEKESH_PLAYWRIGHT_PATH` to its
package directory.

## License

Bekesh is available under the [MIT License](LICENSE). See
[third-party notices](THIRD_PARTY_NOTICES.md) for the provenance and terms of
the compact Unicode joining-property data.
