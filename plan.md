## Main conclusion

Yes. The project is quite viable, provided the first version is described precisely as **font-aware insertion of U+0640 ARABIC TATWEEL to approximate kashida justification**, rather than as a complete implementation of calligraphic kashida.

That distinction matters. A true kashida can involve reconfiguring a connection, selecting contextual or alternate glyphs, or continuously elongating part of a glyph. A literal U+0640 is an ordinary character whose behavior depends on the font and shaping engine. W3C’s Arabic Layout Requirements describes TATWEEL insertion as the simpler but more limited implementation strategy, and recommends combining elongation with other justification mechanisms in sophisticated systems. ([W3C][1])

The especially fortunate discovery is that **a very closely related project appeared on August 20, 2026**, only eight days ago: Khaled Hosny’s `raqim-kashida`. It solves the orthographic and aesthetic-candidate half of your problem while deliberately leaving font shaping, width measurement, and space allocation to the caller. That is almost exactly the architectural boundary I would recommend for your TypeScript library. ([حروف ألف][2])

## The most useful prior art

### 1. `aliftype/raqim-kashida`: the best candidate-selection model

`raqim-kashida` is a Rust library that finds possible U+0640 insertion points and assigns priorities to them. It does **not** attempt to shape the text, inspect the font, or fill a target width. Its output is intended to be consumed by another layout component.

Its particularly useful ideas are:

- Rule sets are style-specific rather than universal.
- Built-in patterns cover Arabic Naskh, Arabic Nastaliq, a simpler Arabic model, and Syriac.
- Rules operate primarily in terms of Unicode `Joining_Group`, rather than brittle lists of literal characters.
- Rules can suppress otherwise legal connections, override imported patterns, and assign different priorities.
- A candidate is emitted only where an actual connection exists; right-joining letters and ZWNJ boundaries are respected.
- Font-specific or user-specific rule sets can replace the built-ins.

The accompanying article explicitly notes that different calligraphic styles permit very different elongations: Ruqʿah may permit none, while Diwani and other styles impose their own restrictions. It also criticizes the single generic rule set inherited by several older layout implementations as adequate mainly for simple Arabic fonts. ([حروف ألف][2])

For your project, I would either:

1. compile the Rust library to WebAssembly and wrap it in TypeScript, or
2. port its relatively compact pattern compiler and matcher into TypeScript.

The repository is MIT-licensed, which makes either route comparatively straightforward. ([GitHub][3])

### 2. HarfBuzz’s safe-to-insert-tatweel flag: the shaping veto

HarfBuzz can be asked to produce `HB_GLYPH_FLAG_SAFE_TO_INSERT_TATWEEL` information. In effect, this identifies shaped clusters before which U+0640 can be inserted without invalidating the surrounding shaping assumptions.

This flag answers:

> “Would inserting a tatweel here disrupt the shaping?”

It does **not** answer:

> “Would a skilled Arabic typographer consider this an attractive place to elongate?”

That makes it an excellent second-stage filter:

```text
Raqim-style rules: aesthetically ranked possibilities
                  ∩
HarfBuzz flags: shaping-safe possibilities
                  =
candidates for the width solver
```

The relevant HarfBuzz buffer option is `HB_BUFFER_FLAG_PRODUCE_SAFE_TO_INSERT_TATWEEL`, introduced in HarfBuzz 5.1.0 and disabled by default. ([HarfBuzz Manual][4])

`harfbuzzjs` now has a TypeScript/ESM API and exposes buffer and glyph information, making it the most natural shaping backend for a browser-and-Node TypeScript package. Its supplied WASM build is intentionally a reduced HarfBuzz build, so you would want to verify that the exact flags and functions you need are exported, or build a slightly fuller WASM artifact. The project is MIT-licensed. ([GitHub][5])

### 3. Qt’s `QTextEngine`: the best production allocation algorithm to study

Qt’s current text engine contains a mature Arabic-justification implementation. It is valuable because it works at the **shaped glyph and cluster level**, rather than simply rewriting Unicode text with a regex.

The Qt implementation:

- assigns priority classes to kashida opportunities;
- records the actual shaped kashida glyph and its measured width;
- selects preferred opportunities within words;
- consumes the required extra line width using those measured kashidas;
- works through successively lower priority levels;
- falls back to spacing when elongation alone does not supply the required width.

This is close to the allocation half of your proposed library. In broad terms, `raqim-kashida` supplies a much better modern candidate model, while Qt supplies an excellent model of how candidates can be allocated against a measured horizontal deficit. ([GitHub][6])

Qt’s source is available under its commercial and LGPL/GPL licensing arrangements, so I would treat it primarily as an algorithmic reference unless your own package’s licensing is compatible. ([GitHub][6])

### 4. `aliftype/kashida-js` and old HarfBuzz: the classic heuristic baseline

Hosny’s earlier `kashida-js` is a small JavaScript implementation of the commonly reproduced Microsoft Internet Explorer Arabic-justification rules. An older HarfBuzz implementation contains substantially the same scheme and explicitly attributes it to Microsoft Arabic IE.

The classic priority sequence favors, approximately:

1. an existing user-entered tatweel;
2. positions involving initial or medial sīn/ṣād forms;
3. positions before certain final hāʾ, tāʾ marbūṭa, or dāl forms;
4. positions before certain final alif, ṭāʾ, lām, kāf, and related forms;
5. certain bāʾ–yāʾ or bāʾ–rāʾ patterns;
6. positions involving wāw, ʿayn, qāf, or fāʾ;
7. other connected final letters.

The implementation normally selects the highest-priority opportunity in each word and, for ties, prefers a point closer to the end of the word. It also contains explicit protection against lām–alif behavior. ([GitHub][7])

This is worth retaining in your repository as:

- a very readable control implementation;
- a fallback “simple Arabic” rule set;
- a way to compare a fixed priority table with Raqim’s extensible patterns.

`kashida-js` is Apache-2.0-licensed; the old HarfBuzz code uses permissive licensing. ([GitHub][8])

### 5. Nagwa’s `kashida-engine`: the closest existing TypeScript API

The repository `Nagwa-Limited-Community/kashida-engine` may be the closest literal predecessor to what you described. It is written in TypeScript, uses Canvas `measureText()`, and exposes functions for making strings attain common measured widths in a given font.

Its basic procedure is:

```text
additional width needed
÷
measured width of an isolated U+0640
≈
number of tatweels to insert
```

It then distributes those tatweels among regex-selected Arabic positions, with some hard-coded exceptions for lām–alif and forms of the divine name. ([GitHub][9])

This is useful prior art in two ways:

- Its outward-facing TypeScript API resembles the one you might build.
- Its limitations show exactly what your implementation can improve.

In particular, an isolated tatweel’s width cannot safely be assumed to be an additive constant at every connection. Contextual substitution, ligatures, alternate forms, and the font’s treatment of repeated U+0640 can alter the resulting shaped width. Nor can a broad Arabic-character regex determine whether a connection is typographically suitable. Your solver should therefore insert, reshape, and remeasure rather than estimating the answer through division alone.

I did not find a clearly surfaced license declaration for this repository, so I would verify that before copying code.

### 6. W3C ALReq and OpenType `jalt`/JSTF: the design horizon

W3C Arabic Layout Requirements is the best concise conceptual reference. It explains why excessively long, numerous, or adjacent kashidas produce uneven visual color; why preferred elongation points depend on typography; and why a good justification system may combine elongation with controlled word spacing or alternate forms. ([W3C][1])

Two OpenType mechanisms describe what a more advanced future version could do:

- The `jalt` feature supplies wider or narrower glyph alternatives intended for justification. For Arabic, these can reduce reliance on literal tatweels.
- The JSTF table describes prioritized justification actions, including GSUB substitutions, GPOS adjustments, and extender glyphs such as kashidas.

JSTF’s model is especially instructive: it treats justification as a series of ranked shaping actions and expects the client to reshape after applying them. Even where practical engine support is limited, that is a sound conceptual design for your internal solver. ([Microsoft Learn][10])

### 7. Academic and experimental systems

I would include three items in a “beyond the MVP” section of the repository bibliography:

**Benatia, Elyaakoubi, and Lazrek, “Arabic Text Justification,” TUGboat 27.2 (2006).** This is a frequently cited account of Arabic justification grounded in traditional typographic and calligraphic processes. ([Semantic Scholar][11])

**Azmi and Alsaiari, “A calligraphic based scheme to justify Arabic text improving readability and comprehension,” Computers in Human Behavior 39 (2014), 177–186.** Their proposed procedure first uses alternate letterforms and then applies kashida under explicit placement and length restrictions to fill the remaining space. That two-stage strategy is a useful corrective to a tatweel-only model. ([ResearchGate][12])

**Amine Anane’s DigitalKhatt work.** DigitalKhatt explores Arabic justification using dynamic or variable font forms, contextual alternates, and a modified HarfBuzz/OpenType pipeline. Its TypeScript web platform and HarfBuzz fork are open source. This is the advanced end of the spectrum: rather than inserting fixed-width characters, the system can manipulate glyph forms and elongation continuously. ([Semantic Scholar][13])

### 8. Babel and TypoArabic: your initial regression corpus

The Babel Arabic-justification issue tracker contains concrete failure cases that are more valuable than generic unit strings. Reported problems include:

- kashida being displaced across a ligature and appearing at an illegal connection;
- insertion on the wrong side of combining marks;
- mishandling of existing tatweels;
- elongation appearing at the end of a word;
- incorrect behavior around special ligatures and contextual forms.

TypoArabic’s survey adds visual examples showing why baseline-length rectangles or hard-coded tatweel glyphs fail in fonts whose joins curve, descend, or employ contextual alternates. ([GitHub][14])

I would turn these directly into test fixtures.

## A suitable architecture for the TypeScript library

The most important design decision is to separate three concerns:

```ts
interface CandidateEngine {
  findCandidates(text: string, ruleSet: KashidaRuleSet): readonly KashidaCandidate[];
}

interface ArabicShaper {
  shape(text: string, font: FontSpec): ShapedRun;
  measure(run: ShapedRun): number;
  safeTatweelClusters(run: ShapedRun): ReadonlySet<number>;
}

interface WidthSolver {
  fit(
    source: string,
    candidates: readonly KashidaCandidate[],
    targetWidth: number,
    shaper: ArabicShaper,
    font: FontSpec,
  ): JustificationResult;
}
```

A candidate should identify a **source-text shaping cluster**, not merely a JavaScript UTF-16 index:

```ts
interface KashidaCandidate {
  cluster: number;
  priority: number;
  wordIndex: number;
  ruleId: string;
  maxCount?: number;
}
```

Only when producing the final edited string should that cluster be translated into a UTF-16 insertion index.

A plausible public API would be:

```ts
interface JustifyWithTatweelOptions {
  text: string;
  targetWidth: number;

  font: {
    data: ArrayBuffer;
    size: number;
    language?: string;
    features?: Record<string, boolean | number>;
    variations?: Record<string, number>;
  };

  ruleSet?: "arabic-naskh" | "arabic-nastaliq" | "arabic-simple" | KashidaRuleSet;

  fit?: "nearest" | "not-over" | "not-under";
  maxTatweelsPerPoint?: number;
  maxPointsPerWord?: number;
}

interface TatweelEdit {
  utf16Index: number;
  count: number;
  candidatePriority: number;
  ruleId: string;
}

interface JustificationResult {
  sourceText: string;
  displayText: string;
  targetWidth: number;
  measuredWidth: number;
  residual: number;
  edits: readonly TatweelEdit[];
  diagnostics: readonly string[];
}
```

I would call the public operation something like `justifyWithTatweel()` or `fitWithKashida()`, but use `TatweelEdit` internally so that the implementation does not blur the distinction between calligraphic elongation and literal U+0640 insertion.

## The fitting procedure

For an already selected single Arabic-script line or shaping run:

1. **Shape and measure the untouched text.** If it is already wider than the target, a tatweel-only algorithm cannot solve the problem.

2. **Generate ranked candidates** using Raqim-style, script-style-specific patterns.

3. **Intersect them with HarfBuzz’s safe insertion clusters.**

4. **Evaluate actual shaped gains.** Insert one U+0640 at a candidate, reshape the complete run, and measure it. Do not derive the gain from an isolated tatweel glyph.

5. **Search combinations.** A Qt-like greedy solver is a good MVP: choose at most one preferred point per word, work from higher to lower priority, and add tatweels while useful. A later version can use bounded beam search to find a visually better combination.

6. **Return the nearest permitted result**, along with its residual width and all edits. Optionally apply tightly capped word spacing only after suitable kashida opportunities are exhausted.

A beam-search score could look like:

```text
score =
    absolute width error
  + total-tatweel penalty
  + repeated-tatweels-at-one-point penalty
  + low-priority-candidate penalty
  + multiple-points-in-one-word penalty
  + nearby-kashidas penalty
  + overshoot penalty
```

The penalties make a difference because several strings can be equally close to the target width while looking very different.

## Important scope decisions

For the first release, I would explicitly support **one already resolved Arabic-script RTL run**, not arbitrary paragraphs containing mixed bidi text, fallback fonts, and line breaking. Paragraph layout introduces a second optimization problem: choosing line breaks and elongation together.

I would also require actual font bytes rather than accepting only a CSS family name. Font bytes make shaping reproducible in Node and the browser and let you account for OpenType features and variable-font axes. A Canvas adapter can still be offered as a lightweight browser backend, but it will not expose shaping clusters or HarfBuzz safety flags.

Finally, treat the justified string as a **presentation artifact**, not canonical text. Literal tatweels can affect search, comparison, copying, indexing, and text processing. Preserve the clean source and return the inserted tatweels as a reversible edit list. ([University of Reading Research][15])

## Initial test matrix

The first regression suite should cover:

- fully vocalized Arabic with multiple combining marks;
- existing U+0640 characters;
- lām–alif and Allāh-related ligatures;
- ZWJ and ZWNJ;
- connections after right-joining letters;
- contextual ligatures and alternate forms;
- Persian and Urdu letters outside a simplistic Arabic regex;
- mixed Arabic, punctuation, European digits, and Arabic-Indic digits;
- fonts representing simple Naskh, more elaborate Naskh, Nastaliq, and a style that rejects elongation;
- repeated insertions at one point versus one insertion at several words.

The Babel failures and Raqim pattern tests provide a useful seed corpus for most of these categories. ([GitHub][3])

## Recommended starting stack

The strongest practical combination is:

**Raqim patterns for candidate ranking → HarfBuzz WASM for shaping and safety → a Qt-inspired width allocator → Babel and TypoArabic cases for regression testing.**

Nagwa’s TypeScript library gives you a useful model of the desired outer API, while `kashida-js` gives you a compact baseline against which to demonstrate why style-specific rules and repeated reshaping produce better results. This lets the project begin as a manageable U+0640 fitting library without closing off later support for `jalt`, variable-font elongation, or JSTF-like multi-stage justification.

[1]: https://www.w3.org/TR/alreq/ "https://www.w3.org/TR/alreq/"
[2]: https://aliftype.com/blog/introducing-raqim-kashida/english "https://aliftype.com/blog/introducing-raqim-kashida/english"
[3]: https://github.com/aliftype/raqim-kashida "https://github.com/aliftype/raqim-kashida"
[4]: https://harfbuzz.github.io/harfbuzz-hb-buffer.html "https://harfbuzz.github.io/harfbuzz-hb-buffer.html"
[5]: https://github.com/harfbuzz/harfbuzzjs/releases "https://github.com/harfbuzz/harfbuzzjs/releases"
[6]: https://github.com/qt/qtbase/raw/refs/heads/dev/src/gui/text/qtextengine.cpp "https://github.com/qt/qtbase/raw/refs/heads/dev/src/gui/text/qtextengine.cpp"
[7]: https://github.com/aliftype/kashida-js/blob/main/kashida.js "https://github.com/aliftype/kashida-js/blob/main/kashida.js"
[8]: https://github.com/aliftype/kashida-js "https://github.com/aliftype/kashida-js"
[9]: https://github.com/Nagwa-Limited-Community/kashida-engine "https://github.com/Nagwa-Limited-Community/kashida-engine"
[10]: https://learn.microsoft.com/en-us/typography/opentype/spec/features_fj "https://learn.microsoft.com/en-us/typography/opentype/spec/features_fj"
[11]: https://www.semanticscholar.org/paper/Arabic-text-justification-Jamal-Benatia/07c11fabdd32c6d85a006bb9bb9d1512687a094a "https://www.semanticscholar.org/paper/Arabic-text-justification-Jamal-Benatia/07c11fabdd32c6d85a006bb9bb9d1512687a094a"
[12]: https://www.researchgate.net/publication/264382424_A_calligraphic_based_scheme_to_justify_Arabic_text_improving_readability_and_comprehension "https://www.researchgate.net/publication/264382424_A_calligraphic_based_scheme_to_justify_Arabic_text_improving_readability_and_comprehension"
[13]: https://www.semanticscholar.org/paper/Arabic-text-justification-using-LuaLaTeX-and-the-Anane/7916eb9c1751494f410c0a2369115a5c8d98bd0e "https://www.semanticscholar.org/paper/Arabic-text-justification-using-LuaLaTeX-and-the-Anane/7916eb9c1751494f410c0a2369115a5c8d98bd0e"
[14]: https://github.com/latex3/babel/issues/258 "https://github.com/latex3/babel/issues/258"
[15]: https://research.reading.ac.uk/typoarabic/on-arabic-justification-part-1/ "https://research.reading.ac.uk/typoarabic/on-arabic-justification-part-1/"
