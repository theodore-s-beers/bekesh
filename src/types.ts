export interface JustifyOptions {
  /** Clean source text. It is never mutated or normalized. */
  text: string;
  /** Desired inline width in CSS pixels. */
  targetWidth: number;
  /** A valid CSS font shorthand, including its size. */
  font: string;
  /** Permitted measurement overshoot in CSS pixels. Defaults to zero. */
  tolerance?: number;
}

export interface TatweelCandidate {
  /** UTF-16 offset in the source text before which U+0640 is inserted. */
  utf16Index: number;
  /** Higher values indicate a more desirable elongation point. */
  priority: number;
  /** Zero-based Arabic-script word index. Punctuation and digits start a new word. */
  wordIndex: number;
  ruleId: string;
}

export interface TatweelEdit extends TatweelCandidate {
  count: number;
}

export type JustificationDiagnostic =
  | "dom-verification-adjusted"
  | "dom-verification-fallback"
  | "iteration-safety-limit-reached"
  | "no-adjustable-spaces"
  | "source-overflows-target";

export interface JustificationResult {
  sourceText: string;
  displayText: string;
  sourceWidth: number;
  /** Width after tatweel insertion but before additional word spacing. */
  measuredWidth: number;
  targetWidth: number;
  /** Target minus measuredWidth. Negative when the source already overflows. */
  remainingWidth: number;
  adjustableSpaceCount: number;
  /** Additional CSS word-spacing per U+0020 space. */
  wordSpacing: number;
  edits: readonly TatweelEdit[];
  diagnostics: readonly JustificationDiagnostic[];
}

export interface CandidateEngine {
  findCandidates(text: string): readonly TatweelCandidate[];
}

export type TextMeasurer = (text: string, font: string) => number;
