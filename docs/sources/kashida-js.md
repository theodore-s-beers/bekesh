# kashida-js

Reviewed
[`be9874f`](https://github.com/aliftype/kashida-js/commit/be9874ffa29c0178c0a748bedd54598cc6ec7379)
on 2026-08-30. Upstream is Apache-2.0-licensed.

## Algorithm

The implementation derives character families from Unicode Joining_Group and
Joining_Type data, skips nonspacing marks when looking for neighbors, and
rejects connections after right-joining characters. Its simple algorithm
collects the classic Microsoft/Arabic-IE opportunities in this order:

1. existing user tatweel;
2. after initial or medial sīn/ṣād-family forms;
3. before final hāʾ/tāʾ marbūṭa/dāl-family forms;
4. before selected final alif/ṭāʾ/lām/kāf-family forms, excluding lām–alif;
5. selected medial bāʾ-family sequences;
6. before selected final wāw/ʿayn/qāf/fāʾ-family forms; and
7. before another connected final letter, excluding lām–alif.

The numeric values in the code increase down this list, but insertion sorts
ascending, so a lower number is preferred. Ties prefer the later text index.
By default only the best candidate in each whitespace-delimited word is used.

## Notable details

- A bare-tatweel regex excludes U+0640 followed by superscript alif or hamza
  above, preserving a tatweel that acts as a mark seat.
- The implementation uses JavaScript string indices. That is workable for the
  covered BMP characters but is not a general cluster model.
- The public algorithm enum contains `naskh`, but only `simple` is implemented
  in the reviewed revision.
- Candidate selection does not inspect shaping results or fonts.

## Lessons for Bekesh

Retain an independently implemented equivalent as a transparent baseline. It
is valuable for comparisons, compatibility, and explaining why a
style-specific candidate engine improves results. Do not adopt its numeric
priority direction without normalizing it at the API boundary.
