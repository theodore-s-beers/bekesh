# raqim-kashida

Reviewed [`e95df20`](https://github.com/aliftype/raqim-kashida/commit/e95df2093348e7b361298b223e8f360c071fc57a) on 2026-08-30. Upstream is MIT-licensed.

## What it owns

The crate compiles a pattern language and finds ranked kashida points in text. It analyzes Unicode joining behavior and grapheme clusters, but explicitly leaves fonts, shaping, measurement, and justification to its caller.

Its public point consists of a grapheme-cluster index after which the kashida goes and a priority from 0 through 9, where higher is preferable. Existing bare tatweels can be removed before candidate generation; tatweels carrying a mark are retained because they serve as the mark's seat.

## Pattern model

The model is compact but expressive:

- Unicode Joining_Group references, literal letters, sets, complements, and a wildcard;
- positional “rasm folding,” so related skeletons can share a rule where their initial or medial forms coincide;
- joined-run boundary tokens;
- constant or run-length-sensitive priorities;
- `!` suppression rules;
- ordered overrides and imports of built-in sets; and
- Arabic Naskh, Arabic Nastaliq, simple Arabic, and Syriac built-ins.

Rules are last-wins at a connection. An absent weight means no candidate, priority zero means a weak candidate, and suppression removes a point that an earlier general rule allowed.

## Allocation example

The example justifier is deliberately monospaced. It keeps the highest-ranked point in each word, makes passes from higher to lower priority, and caps repeats at a point. This is an illustrative consumer, not part of candidate discovery.

## Lessons for Bekesh

Bekesh directly implements the parts of Raqim's Naskh model needed for Persian text: Unicode joining groups, positional rasm folding, joined runs, length-sensitive matrix priorities, and explicit suppressions. It does not include Raqim's pattern language or its other style rules. Bekesh also preserves rule IDs in its results even though Raqim's public point contains only index and priority.

Do not conflate a Naskh-rule candidate with permission from a particular font. A future shaping-aware backend should still apply a font-level safety check before actual-width evaluation.
