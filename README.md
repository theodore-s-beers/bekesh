# Bekesh

This repository is a working library of prior art for a future TypeScript
implementation of Arabic-script justification by kashida (elongation), with an
initial focus on inserting U+0640 ARABIC TATWEEL.

The repository combines prior-art research with an early browser-first
implementation. Its purpose is to make the design evidence inspectable: what
each existing system does, which parts are reusable, where shaping changes the
problem, and which failures should become regression tests.

## Start here

- [Research synthesis](plan.md) — the original survey and proposed architecture
- [Prior-art catalog](docs/catalog.md) — a compact map of projects and standards
- [Implementation comparison](docs/comparison.md) — responsibilities and
  tradeoffs side by side
- [Source notes](docs/sources/README.md) — detailed notes tied to specific source
  revisions
- [Regression corpus](corpus/README.md) — test categories and fixture policy
- [`cases.json`](corpus/cases.json) — machine-readable starter cases
- [Third-party notices](THIRD_PARTY_NOTICES.md) — provenance and terms for the
  compact Unicode joining-property data

## Prototype API

The current MVP uses Canvas for fast candidate search, verifies the selected
result against browser DOM layout, inserts U+0640 without exceeding the
requested width, and returns CSS word spacing for the residual:

```ts
import { justifyWithKashida } from "bekesh";

const result = await justifyWithKashida({
  text: "توانا بود هر که دانا بود",
  targetWidth: 420,
  font: '32px "Scheherazade New"',
});

element.textContent = result.displayText;
element.style.font = '32px "Scheherazade New"';
element.style.wordSpacing = `${result.wordSpacing}px`;
```

`justifyWithKashida()` waits for the requested font to load. The caller must
render with the same typographic settings used for measurement. The current
fallback counts ordinary U+0020 spaces; line breaking, shrinking, and mixed-run
bidi layout are outside the MVP.

The pure `fitWithKashida()` operation accepts an injected measurer and candidate
engine. This keeps the allocation algorithm deterministic in tests and leaves
room for a HarfBuzz backend later.

### Development

```sh
pnpm install
pnpm test
pnpm test:browser
pnpm check
pnpm format:check
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

## Scope

The first implementation informed by this research should accept one resolved
Arabic-script run and a concrete font, then:

1. find culturally and stylistically appropriate elongation candidates;
2. reject candidates that are unsafe for the actual shaped run;
3. insert, reshape, and measure against a target width; and
4. return reversible edits rather than treating the modified string as source
   text.

Paragraph line breaking, bidi resolution, fallback-font selection, and fully
calligraphic or variable-glyph elongation are useful later work, but they are
not the proposed MVP.

## Research conventions

- Prefer primary sources: project code, specifications, issue reports, and
  papers.
- Pin code observations to a commit when possible. Links to moving branches are
  for navigation only.
- Distinguish observed behavior from a proposed design.
- Record licensing before copying any code or fixtures. This repository
  currently contains notes and newly written test inputs, not vendored source.
- Preserve clean Arabic source text. U+0640 output is a presentation artifact.
- Use “kashida” for the broader typographic concept and “tatweel” when the
  mechanism specifically means inserting U+0640.

## Adding a source

Add the source to [the catalog](docs/catalog.md), create a note under
`docs/sources/` when it contributes an algorithm or failure case, and add only
the smallest independently written regression case needed to preserve the
lesson. Include an access date, revision or publication version, upstream URL,
license status, and a clear “use for our design” section.
