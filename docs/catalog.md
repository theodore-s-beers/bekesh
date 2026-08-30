# Prior-art catalog

Accessed 2026-08-30 unless otherwise noted.

## Candidate selection

### raqim-kashida

- Upstream: [aliftype/raqim-kashida](https://github.com/aliftype/raqim-kashida)
- Snapshot reviewed:
  [`e95df20`](https://github.com/aliftype/raqim-kashida/commit/e95df2093348e7b361298b223e8f360c071fc57a)
- Language/license: Rust, MIT
- Contribution: ranked insertion candidates from a compact pattern language;
  built-in Arabic Naskh, Arabic Nastaliq, simple Arabic, and Syriac rule sets
- Boundary: deliberately does not shape, inspect fonts, measure, or justify
- Detailed note: [raqim-kashida](sources/raqim-kashida.md)

This is the strongest model for the candidate engine. Particularly relevant
ideas are Unicode Joining_Group matching, style-specific rule sets, explicit
suppression, length-sensitive priorities, joined-run boundaries, and grapheme
cluster indices.

### kashida-js

- Upstream: [aliftype/kashida-js](https://github.com/aliftype/kashida-js)
- Snapshot reviewed:
  [`be9874f`](https://github.com/aliftype/kashida-js/commit/be9874ffa29c0178c0a748bedd54598cc6ec7379)
- Language/license: JavaScript, Apache-2.0
- Contribution: compact implementation of the classic Microsoft/Arabic-IE
  priority heuristic
- Boundary: candidate selection only; the Naskh enum value is present but not
  implemented at the reviewed revision
- Detailed note: [kashida-js](sources/kashida-js.md)

Keep this as a readable baseline and compatibility rule set, not as the sole
typographic policy.

## Shaping safety and measurement

### HarfBuzz

- Upstream: [HarfBuzz](https://github.com/harfbuzz/harfbuzz)
- Documentation: [`hb-buffer`](https://harfbuzz.github.io/harfbuzz-hb-buffer.html)
- License: old MIT-style license
- Contribution: `HB_GLYPH_FLAG_SAFE_TO_INSERT_TATWEEL` marks shaped clusters
  before which U+0640 can be inserted without interrupting shaping
- Important boundary: the flag explicitly does not determine script-specific
  or aesthetically appropriate elongation places

The glyph flag is produced only when
`HB_BUFFER_FLAG_PRODUCE_SAFE_TO_INSERT_TATWEEL` is enabled. Both were introduced
in HarfBuzz 5.1.0.

### harfbuzzjs

- Upstream: [harfbuzz/harfbuzzjs](https://github.com/harfbuzz/harfbuzzjs)
- Snapshot reviewed:
  [`91f4124`](https://github.com/harfbuzz/harfbuzzjs/commit/91f412432158a74611b28f7d6c86a071d5e60545)
- Language/license: TypeScript plus WebAssembly, MIT
- Contribution: browser/Node HarfBuzz binding with TypeScript APIs
- Verified surface: `BufferFlag.PRODUCE_SAFE_TO_INSERT_TATWEEL`, glyph info,
  glyph flags, clusters, advances, font variations, and shaping are exported in
  the reviewed snapshot

This is the leading shaping backend for a TypeScript MVP. An integration spike
still needs to prove cluster-to-source mapping and the exact flag behavior with
representative fonts.

## Width allocation

### Qt text engine

- Upstream file:
  [`qtextengine.cpp`](https://github.com/qt/qtbase/blob/dev/src/gui/text/qtextengine.cpp)
- Snapshot reviewed:
  [`56bc620`](https://github.com/qt/qtbase/commit/56bc6209fdea53de68dc7d45949ff05835101124)
- Language/license: C++; Qt commercial or LGPL/GPL terms (consult upstream)
- Contribution: production allocation algorithm over shaped glyphs, with
  Arabic priority classes, one preferred point per word, measured extender
  widths, repeated priority passes, and spacing fallback
- Detailed note: [Qt text engine](sources/qt.md)

Treat Qt as algorithmic reference unless the eventual project's licensing and
reuse strategy are reviewed separately.

### Nagwa kashida-engine

- Upstream:
  [Nagwa-Limited-Community/kashida-engine](https://github.com/Nagwa-Limited-Community/kashida-engine)
- Snapshot reviewed:
  [`fe831a6`](https://github.com/Nagwa-Limited-Community/kashida-engine/commit/fe831a64d2b7ef23791101cd37e8226c3d609abb)
- Language/license status: TypeScript; `package.json` declares ISC, but no
  standalone license text was present in the reviewed tree
- Contribution: close precedent for a browser-facing TypeScript API using
  Canvas measurement
- Boundary: estimates count by dividing missing width by an isolated U+0640
  width, then distributes tatweels over regex-selected positions
- Detailed note: [Nagwa kashida-engine](sources/nagwa.md)

Useful as an API and baseline comparison. Do not copy code until the incomplete
license presentation has been resolved.

## Standards and design horizon

### W3C Arabic Layout Requirements

- Source: [Arabic Layout Requirements](https://www.w3.org/TR/alreq/)
- Kind: W3C Working Group Note
- Contribution: terminology, script behavior, and the limits of treating
  Arabic justification as repeated insertion of a generic tatweel glyph

Use this as the conceptual baseline for explaining why candidate quality,
font behavior, and a combination of elongation and spacing matter.

### OpenType justification mechanisms

- Source:
  [OpenType justification features](https://learn.microsoft.com/en-us/typography/opentype/spec/features_fj)
- Contribution: `jalt` substitution and JSTF's prioritized GSUB, GPOS, and
  extender-glyph model

These are beyond a U+0640 MVP but suggest an internal abstraction based on
ranked shaping actions rather than hard-coding “insert one character.”

## Failure reports and visual evidence

### Babel issue 258

- Source:
  [Arabic: Kashidas displaced by ligatures](https://github.com/latex3/babel/issues/258)
- Opened: 2023-08-21; open when reviewed
- Contribution: concrete ligature displacement and mark-placement failures

Issue reports are evidence and fixture leads, not automatically reusable test
data. Recreate minimal strings independently and preserve links to the report.

### TypoArabic survey

- Source:
  [On Arabic justification, part 1](https://research.reading.ac.uk/typoarabic/on-arabic-justification-part-1/)
- Contribution: visual evidence that a rectangular or context-free extender is
  unsuitable for fonts with curved, descending, or contextual joins

## Academic and advanced systems backlog

These are cataloged in [the research synthesis](../plan.md) but need dedicated
source notes after the primary publications are obtained:

- Benatia, Elyaakoubi, and Lazrek, “Arabic Text Justification” (2006)
- Azmi and Alsaiari, calligraphic justification and readability (2014)
- DigitalKhatt's variable/dynamic glyph approach and modified shaping pipeline
