# Research synthesis

> This document predates Bekesh's initial implementation. It records the prior art and architectural options considered during design; some proposed interfaces and backend choices differ from the current browser-first API. See the [README](../README.md) for current behavior and usage.

## Main conclusion

The project is viable because its initial scope is described precisely as **font-aware insertion of U+0640 ARABIC TATWEEL to approximate kashida justification**, rather than as a complete implementation of calligraphic kashida.

That distinction matters. A true kashida can involve reconfiguring a connection, selecting contextual or alternate glyphs, or continuously elongating part of a glyph. A literal U+0640 is an ordinary character whose behavior depends on the font and shaping engine. W3C’s Arabic Layout Requirements describes TATWEEL insertion as the simpler but more limited implementation strategy, and recommends combining elongation with other justification mechanisms in sophisticated systems. ([W3C][1])

A closely related project appeared on August 20, 2026: Khaled Hosny’s `raqim-kashida`. It solves the orthographic and aesthetic-candidate half of the problem while leaving font shaping, width measurement, and space allocation to the caller. That is close to Bekesh's architectural boundary. ([حروف ألف][2])

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

Two reuse paths were considered:

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

`harfbuzzjs` has a TypeScript/ESM API and exposes buffer and glyph information, making it a natural future shaping backend. Its supplied WASM build is reduced, so an integration must verify the required flags and functions. The project is MIT-licensed. ([GitHub][5])

### 3. Qt’s `QTextEngine`: the best production allocation algorithm to study

Qt’s current text engine contains a mature Arabic-justification implementation. It is valuable because it works at the **shaped glyph and cluster level**, rather than simply rewriting Unicode text with a regex.

The Qt implementation:

- assigns priority classes to kashida opportunities;
- records the actual shaped kashida glyph and its measured width;
- selects preferred opportunities within words;
- consumes the required extra line width using those measured kashidas;
- works through successively lower priority levels;
- falls back to spacing when elongation alone does not supply the required width.

This is close to the allocation half of Bekesh. In broad terms, `raqim-kashida` supplies a strong modern candidate model, while Qt supplies an excellent model of how candidates can be allocated against a measured horizontal deficit. ([GitHub][6])

Qt’s source is available under its commercial and LGPL/GPL licensing arrangements, so it is treated primarily as an algorithmic reference unless a compatible reuse strategy is established. ([GitHub][6])

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

This remains useful in the research archive as:

- a readable historical control implementation; and
- a baseline for comparing fixed priorities with Bekesh's stricter Naskh rules.

`kashida-js` is Apache-2.0-licensed; the old HarfBuzz code uses permissive licensing. ([GitHub][8])

### 5. Nagwa’s `kashida-engine`: the closest existing TypeScript API

The repository `Nagwa-Limited-Community/kashida-engine` may be the closest literal predecessor to Bekesh. It is written in TypeScript, uses Canvas `measureText()`, and exposes functions for making strings attain common measured widths in a given font.

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

- Its outward-facing TypeScript API resembles Bekesh's.
- Its limitations show exactly what Bekesh can improve.

An isolated tatweel’s width is not a safe additive constant. Contextual substitution, ligatures, alternate forms, and repeated U+0640 can change the resulting width. A broad Arabic-character regex also cannot decide whether a connection is suitable. Bekesh therefore inserts and remeasures instead of estimating the result through division alone.

A clearly surfaced license declaration was not found for this repository, so its status would need verification before copying code.

### 6. W3C ALReq and OpenType `jalt`/JSTF: the design horizon

W3C Arabic Layout Requirements is the best concise conceptual reference. It explains why excessively long, numerous, or adjacent kashidas produce uneven visual color; why preferred elongation points depend on typography; and why a good justification system may combine elongation with controlled word spacing or alternate forms. ([W3C][1])

Two OpenType mechanisms describe what a more advanced future version could do:

- The `jalt` feature supplies wider or narrower glyph alternatives intended for justification. For Arabic, these can reduce reliance on literal tatweels.
- The JSTF table describes prioritized justification actions, including GSUB substitutions, GPOS adjustments, and extender glyphs such as kashidas.

JSTF’s model is especially instructive: it treats justification as a series of ranked shaping actions and expects the client to reshape after applying them. Even where practical engine support is limited, that is a sound conceptual design for an advanced internal solver. ([Microsoft Learn][10])

### 7. Academic and experimental systems

Three items show approaches beyond literal U+0640 insertion:

**Benatia, Elyaakoubi, and Lazrek, “Arabic Text Justification,” TUGboat 27.2 (2006).** This is a frequently cited account of Arabic justification grounded in traditional typographic and calligraphic processes. ([Semantic Scholar][11])

**Azmi and Alsaiari, “A calligraphic based scheme to justify Arabic text improving readability and comprehension,” Computers in Human Behavior 39 (2014), 177–186.** Their proposed procedure first uses alternate letterforms and then applies kashida under explicit placement and length restrictions to fill the remaining space. That two-stage strategy is a useful corrective to a tatweel-only model. ([ResearchGate][12])

**Amine Anane’s DigitalKhatt work.** DigitalKhatt explores Arabic justification using dynamic or variable font forms, contextual alternates, and a modified HarfBuzz/OpenType pipeline. Its TypeScript web platform and HarfBuzz fork are open source. This is the advanced end of the spectrum: rather than inserting fixed-width characters, the system can manipulate glyph forms and elongation continuously. ([Semantic Scholar][13])

### 8. Babel and TypoArabic: initial regression leads

The Babel Arabic-justification issue tracker contains concrete failure cases that are more valuable than generic unit strings. Reported problems include:

- kashida being displaced across a ligature and appearing at an illegal connection;
- insertion on the wrong side of combining marks;
- mishandling of existing tatweels;
- elongation appearing at the end of a word;
- incorrect behavior around special ligatures and contextual forms.

TypoArabic’s survey adds visual examples showing why baseline-length rectangles or hard-coded tatweel glyphs fail in fonts whose joins curve, descend, or employ contextual alternates. ([GitHub][14])

These reports can become independently written test fixtures.

## What Bekesh implemented

Bekesh separates candidate selection, width solving, and browser measurement. For one line of text it:

1. waits for the requested CSS font and measures the clean source;
2. finds connected candidates at grapheme boundaries with a Persian Naskh heuristic;
3. inserts one U+0640 at a time and measures each full trial string;
4. repeats the preferred fitting point in each word, using a conservative Naskh pair matrix, joined-run length, positional letter families, and explicit suppressions;
5. verifies the result against DOM layout and backs off if needed; and
6. returns word spacing for the remaining width.

The browser supplies shaping. HarfBuzz safety flags, font bytes, OpenType features, variable-font axes, and style-selectable rule sets are not part of the current API. Bekesh intentionally targets Persian text in Naskh-style fonts. See the [README](../README.md) for its exact contract.

The output remains a **presentation artifact**, not canonical text. Literal tatweels affect search, comparison, copying, and indexing. Bekesh therefore preserves the clean source and reports inserted tatweels as reversible edits. ([University of Reading Research][15])

## Shaping-aware direction

A more advanced backend should keep the same separation of concerns but work with shaping clusters rather than only UTF-16 offsets:

```text
style-specific ranked candidates
    -> HarfBuzz shaping and safe-insertion flags
    -> Qt-inspired width allocation
    -> font-specific regression tests
```

Such a backend could accept font bytes and explicit shaping settings. It could also compare several fits by width error and visual penalties instead of using only a greedy search.

The remaining experiments are listed in the [implementation comparison](comparison.md). Fixture gaps are tracked in the [regression corpus](../corpus/README.md).

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
