import { naskhCandidateEngine } from "./candidates.js";
import { validateOptions } from "./options.js";
import type {
  CandidateEngine,
  JustificationDiagnostic,
  JustificationResult,
  JustifyOptions,
  TatweelCandidate,
  TatweelEdit,
  TextMeasurer,
} from "./types.js";

const TATWEEL = "\u0640";
const MINIMUM_MEASURABLE_GAIN = 1e-7;
const MAXIMUM_PASSES = 10_000;

interface MutableEdit extends TatweelCandidate {
  count: number;
}

interface WordState {
  candidates: TatweelCandidate[];
  active: TatweelCandidate | undefined;
  exhausted: boolean;
  rejected: Set<number>;
}

function renderTrial(
  displayText: string,
  sourceIndex: number,
  edits: ReadonlyMap<number, MutableEdit>,
) {
  let displayIndex = sourceIndex;
  for (const edit of edits.values()) {
    if (edit.utf16Index <= sourceIndex) {
      displayIndex += edit.count;
    }
  }

  return displayText.slice(0, displayIndex) + TATWEEL + displayText.slice(displayIndex);
}

function groupedCandidates(candidates: readonly TatweelCandidate[]): WordState[] {
  const groups = new Map<number, TatweelCandidate[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.wordIndex) ?? [];
    group.push(candidate);
    groups.set(candidate.wordIndex, group);
  }

  return [...groups.values()]
    .map((group) => ({
      candidates: group.sort(
        (left, right) => right.priority - left.priority || right.utf16Index - left.utf16Index,
      ),
      active: undefined,
      exhausted: false,
      rejected: new Set<number>(),
    }))
    .sort(
      (left, right) => (right.candidates[0]?.priority ?? 0) - (left.candidates[0]?.priority ?? 0),
    );
}

function adjustableSpaceCount(text: string) {
  return [...text].filter((character) => character === " ").length;
}

export function fitWithKashida(
  options: JustifyOptions,
  measure: TextMeasurer,
  candidateEngine: CandidateEngine = naskhCandidateEngine,
): JustificationResult {
  validateOptions(options);

  const tolerance = options.tolerance ?? 0;
  const sourceWidth = measure(options.text, options.font);
  if (!Number.isFinite(sourceWidth) || sourceWidth < 0) {
    throw new RangeError("The text measurer returned an invalid width");
  }

  const diagnostics: JustificationDiagnostic[] = [];
  const edits = new Map<number, MutableEdit>();
  let displayText = options.text;
  let measuredWidth = sourceWidth;

  if (sourceWidth > options.targetWidth + tolerance) {
    diagnostics.push("source-overflows-target");
  } else {
    const words = groupedCandidates(candidateEngine.findCandidates(options.text));
    let pass = 0;
    let madeProgress = true;

    while (madeProgress && pass < MAXIMUM_PASSES) {
      madeProgress = false;
      pass += 1;

      for (const word of words) {
        const hasActiveCandidate = word.active !== undefined;
        const choices = word.exhausted
          ? []
          : word.active
            ? [word.active]
            : word.candidates.filter((candidate) => !word.rejected.has(candidate.utf16Index));

        for (const candidate of choices) {
          const previous = edits.get(candidate.utf16Index);
          const trialText = renderTrial(displayText, candidate.utf16Index, edits);
          const trialWidth = measure(trialText, options.font);
          const gain = trialWidth - measuredWidth;

          if (!Number.isFinite(trialWidth) || gain <= MINIMUM_MEASURABLE_GAIN) {
            word.rejected.add(candidate.utf16Index);
            if (word.active === candidate) {
              word.active = undefined;
            }
            continue;
          }

          if (trialWidth <= options.targetWidth + tolerance) {
            edits.set(candidate.utf16Index, {
              ...candidate,
              count: (previous?.count ?? 0) + 1,
            });
            displayText = trialText;
            measuredWidth = trialWidth;
            word.active = candidate;
            madeProgress = true;
          } else {
            word.rejected.add(candidate.utf16Index);
            if (hasActiveCandidate) {
              word.exhausted = true;
            }
          }
          if (word.active || hasActiveCandidate) {
            break;
          }
        }
      }
    }

    if (pass === MAXIMUM_PASSES && madeProgress) {
      diagnostics.push("iteration-safety-limit-reached");
    }
  }

  const spaces = adjustableSpaceCount(options.text);
  const remainingWidth = options.targetWidth - measuredWidth;
  const wordSpacing = remainingWidth > 0 && spaces > 0 ? remainingWidth / spaces : 0;

  if (remainingWidth > tolerance && spaces === 0) {
    diagnostics.push("no-adjustable-spaces");
  }

  const finalEdits: TatweelEdit[] = [...edits.values()].sort(
    (left, right) => left.utf16Index - right.utf16Index,
  );

  return {
    sourceText: options.text,
    displayText,
    sourceWidth,
    measuredWidth,
    targetWidth: options.targetWidth,
    remainingWidth,
    adjustableSpaceCount: spaces,
    wordSpacing,
    edits: finalEdits,
    diagnostics,
  };
}
