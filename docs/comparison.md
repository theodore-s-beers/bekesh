# Implementation comparison

No one reviewed system supplies the whole desired pipeline. The useful design
is a composition of their strongest boundaries.

| Source               | Candidate quality      | Shaping-aware | Measures actual run                                                  | Fits target width | Style-specific | TypeScript-ready |
| -------------------- | ---------------------- | ------------- | -------------------------------------------------------------------- | ----------------- | -------------- | ---------------- |
| raqim-kashida        | High, ranked patterns  | No            | No                                                                   | No                | Yes            | Port or WASM     |
| kashida-js           | Fixed heuristic        | No            | No                                                                   | No                | Limited        | Yes              |
| HarfBuzz             | Safety veto only       | Yes           | Yes                                                                  | No                | Font-dependent | Via harfbuzzjs   |
| Qt                   | Fixed priority classes | Yes           | Uses glyph advances                                                  | Yes               | Limited        | No               |
| Nagwa kashida-engine | Broad regex slots      | Canvas only   | Measures final strings, but estimates additions from isolated U+0640 | Approximately     | No             | Yes              |

## Architectural lessons

### Candidate generation and shaping safety answer different questions

Raqim-style rules answer “where is elongation desirable in this style?” The
HarfBuzz flag answers “where can U+0640 be inserted without invalidating the
current shaping?” Neither substitutes for the other. The candidate list for a
font-aware solver is their intersection.

### A source index is not always a JavaScript index

Raqim reports grapheme-cluster positions. HarfBuzz exposes source cluster
values associated with output glyphs. JavaScript string offsets are UTF-16 code
units. The implementation needs an explicit mapping among all three and must
not insert inside a combining sequence or surrogate pair.

### Tatweel width is contextual

Nagwa's isolated-width division is a useful baseline but not a safe model.
Insertion can change contextual forms, ligatures, alternates, or the behavior
of repeated extenders. Every proposed edit should be shaped and measured in its
actual run.

### Allocation is a visual optimization problem

Qt demonstrates a practical greedy policy: retain one preferred Arabic point
per word, visit priorities from high to low, add extenders while they fit, then
fall back to spacing. A TypeScript MVP can follow that shape while reshaping
after edits. A bounded beam search can later compare distributions that have
similar width error but different visual penalties.

## Proposed pipeline

```text
clean source run
    -> grapheme and joining analysis
    -> style-specific ranked candidates
    -> shape with concrete font and request HarfBuzz safety flags
    -> intersect candidates by cluster
    -> try edit, reshape, and measure
    -> allocate against width deficit
    -> return display text, residual, diagnostics, and reversible edits
```

## Experiments needed before implementation

1. Verify the meaning and location of HarfBuzz's safe flag in an RTL glyph
   stream, especially around combining marks and ligatures.
2. Compare UTF-16, code-point, grapheme, and HarfBuzz cluster indices for the
   starter corpus.
3. Measure one and repeated U+0640 insertions at the same connection across
   simple Naskh, complex Naskh, and Nastaliq fonts.
4. Compare a TypeScript port of Raqim's matcher against the Rust result, or
   measure the size and startup cost of a WASM wrapper.
5. Reproduce Qt's priority allocation on a small, independently implemented
   model, then compare it with a bounded search.
