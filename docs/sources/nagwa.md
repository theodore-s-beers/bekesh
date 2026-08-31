# Nagwa kashida-engine

Reviewed [`fe831a6`](https://github.com/Nagwa-Limited-Community/kashida-engine/commit/fe831a64d2b7ef23791101cd37e8226c3d609abb) on 2026-08-30.

`package.json` declares the ISC license, but the reviewed repository tree did not contain a standalone license file or license text. Treat reuse as requiring clarification.

## Public shape

The browser-oriented TypeScript API measures text with Canvas and can transform an array of strings to approximate the widest member. The API takes a CSS font descriptor rather than font bytes.

## Algorithm

For each shorter string, it:

1. measures an isolated U+0640 in the requested Canvas font;
2. divides the missing width by that value and rounds to a tatweel count;
3. locates slots with a hard-coded Arabic regex;
4. masks lām–alif and several forms containing the divine name;
5. distributes counts evenly over matching slots; and
6. inserts repeated U+0640 characters before the second character of each regex match.

The output is not remeasured in a feedback loop.

## Lessons for Bekesh

The library is the closest prior TypeScript API and is a useful control implementation. It also suggests important tests for Bekesh:

- an isolated tatweel width may not equal contextual shaped gain;
- regex character lists age poorly and do not model joining behavior;
- CSS font strings depend on the fonts loaded by the host;
- masking exceptional words cannot replace cluster and shaping analysis; and
- rounding once gives no explicit overshoot policy or residual diagnostic.
