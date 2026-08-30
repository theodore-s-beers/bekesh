# raqim-kashida

Reviewed
[`e95df20`](https://github.com/aliftype/raqim-kashida/commit/e95df2093348e7b361298b223e8f360c071fc57a)
on 2026-08-30. Upstream is MIT-licensed.

## What it owns

The crate compiles a pattern language and finds ranked kashida points in text.
It analyzes Unicode joining behavior and grapheme clusters, but explicitly
leaves fonts, shaping, measurement, and justification to its caller.

Its public point consists of a grapheme-cluster index after which the kashida
goes and a priority from 0 through 9, where higher is preferable. Existing bare
tatweels can be removed before candidate generation; tatweels carrying a mark
are retained because they serve as the mark's seat.

## Pattern model

The model is compact but expressive:

- Unicode Joining_Group references, literal letters, sets, complements, and a
  wildcard;
- positional “rasm folding,” so related skeletons can share a rule where their
  initial or medial forms coincide;
- joined-run boundary tokens;
- constant or run-length-sensitive priorities;
- `!` suppression rules;
- ordered overrides and imports of built-in sets; and
- Arabic Naskh, Arabic Nastaliq, simple Arabic, and Syriac built-ins.

Rules are last-wins at a connection. An absent weight means no candidate,
priority zero means a weak candidate, and suppression removes a point that an
earlier general rule allowed.

## Allocation example

The example justifier is deliberately monospaced. It keeps the highest-ranked
point in each word, makes passes from higher to lower priority, and caps repeats
at a point. This is an illustrative consumer, not part of candidate discovery.

## Use for our design

Model the TypeScript candidate interface on Raqim's narrow responsibility and
cluster-based output. Preserve rule IDs in our result even though Raqim's
public point currently contains only index and priority; provenance will make
diagnostics and rule-set comparison easier.

Two implementation paths remain open:

- compile the Rust crate to WASM; or
- port the pattern compiler and matcher, validating it against upstream tests.

Do not conflate a Raqim candidate with permission from a particular font. Pass
it through shaping safety and actual-width evaluation.
