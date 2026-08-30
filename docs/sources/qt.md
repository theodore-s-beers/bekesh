# Qt text engine

Reviewed
[`56bc620`](https://github.com/qt/qtbase/commit/56bc6209fdea53de68dc7d45949ff05835101124)
on 2026-08-30. Consult Qt's upstream commercial/LGPL/GPL licensing terms before
any source reuse.

## Candidate classes

`QTextEngine` represents justification opportunities as shaped-glyph
attributes. Arabic opportunities range from a normal connection through
classes for wāw, bāʾ–rāʾ, alif, hāʾ/dāl, sīn, and an existing user kashida.
The integer ordering supplies their preference ordering.

Within each word, the allocator retains the candidate with the greatest class;
ties replace the earlier point with the later one. Spaces close the word and
emit the retained point.

## Allocation

For an Arabic point, Qt gets the U+0640 glyph from the selected font engine and
records its advance as the point's kashida width. A zero-width or missing glyph
prohibits that point.

The allocator computes the remaining line width and repeatedly visits Arabic
classes from strongest to weakest. At each matching point it adds a kashida if
the recorded width does not exceed the remaining deficit. When elongation can
no longer consume the width, lower justification classes distribute the
remainder as spacing.

This is allocation in glyph layout, not Unicode source rewriting: the glyph's
justification record stores a kashida count and added space.

## Use for our design

Adopt the broad greedy structure for an MVP:

- prefer one point per word;
- process visual priorities in passes;
- impose explicit repeat limits; and
- expose spacing fallback separately.

Do not carry over the assumption that a cached U+0640 glyph advance is the
complete contextual gain of editing a Unicode run. Our string-producing API
should insert, reshape, and measure each state because contextual substitution
can change more than the extender glyph itself.
