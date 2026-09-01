# Regression corpus

[`cases.json`](cases.json) is a research fixture inventory for candidate generation, indexing, shaping-safety, and solver tests. It is not currently loaded by the automated test suite; selected cases are independently encoded in `test/candidates.test.mjs`. It intentionally does not prescribe the exact insertion point for every case: that answer can vary by style rule set and font.

The corpus stores clean source strings and invariants. Expected display text belongs in backend- and font-specific snapshots later.

## Fixture rules

- Keep source strings minimal and independently written.
- Give invisible characters explicit code-point metadata.
- Do not normalize strings silently; normalization behavior is part of a test.
- A candidate engine test may assert points and priorities for a named rule set.
- A shaping test must name and pin a font file plus shaping features and variations.
- A solver test must record target width, fit policy, measured result, and reversible edits.
- Preserve provenance when a case was motivated by an upstream issue, while avoiding wholesale copying of someone else's fixture collection.

## Coverage still needed

- minimal reproductions of the Babel ligature-displacement reports;
- mark sequences on both sides of a candidate connection;
- Persian and Urdu joining groups;
- punctuation and numeral boundaries;
- multiple words with competing priority classes;
- repeated insertion at one point versus distributed insertions;
- Scheherazade New and at least one additional Naskh typeface; and
- cluster maps containing supplementary-plane code points.
