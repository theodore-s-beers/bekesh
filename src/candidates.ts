import {
  acceptsConnectionFromPrevious,
  arabicJoiningGroup,
  connectsToFollowing,
  isArabicJoiningCharacter,
  isArabicLetter,
} from "./joining.js";
import type { ArabicJoiningGroup } from "./joining.js";
import type { CandidateEngine, TatweelCandidate } from "./types.js";

type JoiningForm = "final" | "initial" | "isolated" | "medial";
type MatrixGrade = "discouraged" | "neutral" | "recommended";

interface Cluster {
  text: string;
  end: number;
  base: string | undefined;
  wordIndex: number;
  isMarkSeat: boolean;
}

interface PendingRunLetter {
  end: number;
  wordIndex: number;
  group: ArabicJoiningGroup | undefined;
  isBareTatweel: boolean;
  canInsertAfter: boolean;
}

interface RunLetter {
  end: number;
  wordIndex: number;
  family: ArabicJoiningGroup | undefined;
  form: JoiningForm;
  isBareTatweel: boolean;
  canInsertAfter: boolean;
}

interface MatrixRow {
  recommended?: readonly ArabicJoiningGroup[];
  neutral?: readonly ArabicJoiningGroup[];
  discouraged?: readonly ArabicJoiningGroup[];
}

const TATWEEL = "\u0640";
const MARK = /^\p{Mark}$/u;
const segmenter = new Intl.Segmenter("fa", { granularity: "grapheme" });

// Adapted from raqim-kashida's formalization of Benatia's Naskh pair matrix
// and Afifi's restrictions; see THIRD_PARTY_NOTICES.md. The values intentionally
// describe only permitted contexts, with no fallback for an arbitrary join.
const NASKH_MATRIX: Readonly<Partial<Record<ArabicJoiningGroup, MatrixRow>>> = {
  Beh: {
    recommended: ["Tah"],
    neutral: ["Alef", "Meem", "Noon", "Heh"],
    discouraged: ["Hah", "Dal", "Reh", "Lam"],
  },
  Hah: {
    recommended: ["Tah"],
    discouraged: ["Alef", "Hah", "Dal", "Reh", "Ain", "Kaf", "Lam", "Meem", "Noon", "Heh", "Waw"],
  },
  Ain: {
    recommended: ["Tah"],
    discouraged: ["Alef", "Hah", "Dal", "Reh", "Ain", "Lam", "Meem", "Noon", "Heh"],
  },
  Seen: {
    neutral: ["Alef", "Beh", "Reh", "Seen", "Sad", "Tah", "Kaf", "Lam", "Noon"],
    discouraged: ["Hah", "Dal", "Ain", "Feh", "Qaf", "Meem", "Heh", "Waw"],
  },
  Sad: {
    neutral: ["Alef", "Beh", "Reh", "Seen", "Sad", "Tah", "Kaf", "Lam", "Noon"],
    discouraged: ["Hah", "Dal", "Ain", "Feh", "Qaf", "Meem", "Heh", "Waw"],
  },
  Tah: {
    neutral: ["Alef", "Beh", "Reh", "Seen", "Sad", "Tah", "Kaf", "Lam", "Noon"],
    discouraged: ["Hah", "Dal", "Ain", "Feh", "Qaf", "Meem", "Heh", "Waw"],
  },
  Feh: {
    recommended: ["Tah"],
    neutral: ["Alef"],
    discouraged: ["Hah", "Dal", "Reh", "Ain", "Lam", "Meem", "Waw"],
  },
  Meem: {
    neutral: ["Tah", "Dal", "Reh"],
    discouraged: ["Alef", "Hah", "Ain", "Kaf", "Lam", "Meem", "Noon", "Heh", "Waw"],
  },
  Heh: {
    neutral: ["Beh"],
    discouraged: ["Alef", "Seen", "Reh", "Dal", "Lam", "Heh"],
  },
};

const SUPPRESSED_BEFORE = new Set<ArabicJoiningGroup>(["Hah", "Sad", "Ain", "Waw"]);
const SUPPRESSED_BEFORE_FINAL = new Set<ArabicJoiningGroup>(["Feh", "Qaf", "Yeh", "YehBarree"]);
const SUPPRESSED_AFTER = new Set<ArabicJoiningGroup>(["Kaf", "Lam"]);
const INITIAL_BEH_FAMILIES = new Set<ArabicJoiningGroup>([
  "AfricanNoon",
  "Beh",
  "FarsiYeh",
  "Noon",
  "Nya",
  "Yeh",
]);
const INITIAL_FEH_FAMILIES = new Set<ArabicJoiningGroup>([
  "AfricanFeh",
  "AfricanQaf",
  "Feh",
  "Qaf",
]);
const FINAL_HEH_FAMILIES = new Set<ArabicJoiningGroup>([
  "Heh",
  "HehGoal",
  "TehMarbuta",
  "TehMarbutaGoal",
]);
const FINAL_NOON_FAMILIES = new Set<ArabicJoiningGroup>(["AfricanNoon", "Noon", "Nya"]);
const FINAL_YEH_FAMILIES = new Set<ArabicJoiningGroup>(["FarsiYeh", "Yeh", "YehWithTail"]);

function isJoiningBase(character: string): boolean {
  return (
    character === TATWEEL || (isArabicLetter(character) && isArabicJoiningCharacter(character))
  );
}

function clustersOf(text: string): Cluster[] {
  const clusters: Cluster[] = [];
  let wordIndex = -1;
  let inWord = false;

  for (const part of segmenter.segment(text)) {
    const characters = [...part.segment];
    if (characters.some((character) => character === TATWEEL || isArabicLetter(character))) {
      if (!inWord) {
        wordIndex += 1;
        inWord = true;
      }
    } else if (
      !characters.every(
        (character) => MARK.test(character) || character === "\u200c" || character === "\u200d",
      )
    ) {
      inWord = false;
    }

    const base = characters.find(isJoiningBase);
    clusters.push({
      text: part.segment,
      end: part.index + part.segment.length,
      base,
      wordIndex: inWord ? wordIndex : -1,
      isMarkSeat:
        base === TATWEEL &&
        characters.some((character) => character !== TATWEEL && MARK.test(character)),
    });
  }

  return clusters;
}

function isConnection(left: Cluster | undefined, right: Cluster | undefined): boolean {
  if (
    !left?.base ||
    !right?.base ||
    left.wordIndex < 0 ||
    left.wordIndex !== right.wordIndex ||
    left.text.includes("\u200c")
  ) {
    return false;
  }

  return connectsToFollowing(left.base) && acceptsConnectionFromPrevious(right.base);
}

function formAt(runLength: number, index: number): JoiningForm {
  if (runLength === 1) return "isolated";
  if (index === 0) return "initial";
  if (index === runLength - 1) return "final";
  return "medial";
}

function rasmFamily(
  group: ArabicJoiningGroup | undefined,
  form: JoiningForm,
): ArabicJoiningGroup | undefined {
  if (!group) return undefined;

  if (form === "initial" || form === "medial") {
    if (INITIAL_BEH_FAMILIES.has(group)) {
      return "Beh";
    }
    if (INITIAL_FEH_FAMILIES.has(group)) {
      return "Feh";
    }
    if (group === "Kaf" || group === "Gaf") {
      return "Kaf";
    }
    return group;
  }

  if (FINAL_HEH_FAMILIES.has(group)) {
    return "Heh";
  }
  if (group === "Feh" || group === "AfricanFeh") return "Feh";
  if (group === "Qaf" || group === "AfricanQaf") return "Qaf";
  if (FINAL_NOON_FAMILIES.has(group)) return "Noon";
  if (FINAL_YEH_FAMILIES.has(group)) return "Yeh";
  if (group === "YehBarree" || group === "BurushaskiYehBarree") return "YehBarree";
  return group;
}

function joinedRuns(clusters: readonly Cluster[]): RunLetter[][] {
  const runs: RunLetter[][] = [];
  let current: PendingRunLetter[] = [];
  let carrier: Cluster | undefined;

  const finishRun = () => {
    if (current.length > 0) {
      runs.push(
        current.map((letter, index) => {
          const form = formAt(current.length, index);
          return {
            end: letter.end,
            wordIndex: letter.wordIndex,
            isBareTatweel: letter.isBareTatweel,
            canInsertAfter: letter.canInsertAfter,
            form,
            family: rasmFamily(letter.group, form),
          };
        }),
      );
    }
    current = [];
    carrier = undefined;
  };

  for (const cluster of clusters) {
    if (cluster.isMarkSeat) {
      if (current.length > 0 && isConnection(carrier, cluster)) {
        const previous = current[current.length - 1];
        if (previous) {
          previous.end = cluster.end;
          previous.canInsertAfter &&=
            !cluster.text.includes("\u200c") && !cluster.text.includes("\u200d");
        }
        carrier = cluster;
      } else {
        finishRun();
      }
      continue;
    }

    if (!cluster.base) {
      finishRun();
      continue;
    }

    if (current.length > 0 && !isConnection(carrier, cluster)) {
      finishRun();
    }

    current.push({
      end: cluster.end,
      wordIndex: cluster.wordIndex,
      group: arabicJoiningGroup(cluster.base),
      isBareTatweel: cluster.text === TATWEEL,
      canInsertAfter: !cluster.text.includes("\u200c") && !cluster.text.includes("\u200d"),
    });
    carrier = cluster;
  }

  finishRun();
  return runs;
}

function matrixGrade(
  left: ArabicJoiningGroup | undefined,
  right: ArabicJoiningGroup | undefined,
): MatrixGrade | undefined {
  if (!left || !right) return undefined;
  const row = NASKH_MATRIX[left];
  if (row?.recommended?.includes(right)) return "recommended";
  if (row?.neutral?.includes(right)) return "neutral";
  if (row?.discouraged?.includes(right)) return "discouraged";
  return undefined;
}

function matrixPriority(grade: MatrixGrade, runLength: number): number {
  const [base, minimum] = grade === "recommended" ? [9, 6] : grade === "neutral" ? [6, 3] : [3, 0];
  return Math.max(minimum, base - Math.abs(runLength - 4));
}

function specialBehPriority(run: readonly RunLetter[], index: number): number | null | undefined {
  if (index !== 0 || run[0]?.family !== "Beh" || run[1]?.family !== "Beh") {
    return undefined;
  }

  if (
    run.length === 4 &&
    run[2]?.family === "Beh" &&
    (run[3]?.family === "Reh" || run[3]?.family === "Noon")
  ) {
    return null;
  }
  if (run.length === 3 && (run[2]?.family === "Noon" || run[2]?.family === "Reh")) {
    return 6;
  }
  if (run[2]?.family === "Beh" || run[2]?.family === "Seen") {
    return 2;
  }
  return undefined;
}

function classify(
  run: readonly RunLetter[],
  index: number,
): Pick<TatweelCandidate, "priority" | "ruleId"> | undefined {
  const left = run[index];
  const right = run[index + 1];
  if (!left || !right) return undefined;
  if (!left.canInsertAfter) return undefined;

  if (left.isBareTatweel) {
    return { priority: 10, ruleId: "existing-tatweel" };
  }

  const grade = matrixGrade(left.family, right.family);
  let candidate = grade
    ? {
        priority: matrixPriority(grade, run.length),
        ruleId: `naskh-matrix-${grade}`,
      }
    : undefined;

  if (right.form === "final" && right.family === "Heh") {
    candidate = { priority: 9, ruleId: "naskh-before-final-heh" };
  }

  if (
    (right.family && SUPPRESSED_BEFORE.has(right.family)) ||
    (right.form === "final" &&
      right.family !== undefined &&
      SUPPRESSED_BEFORE_FINAL.has(right.family)) ||
    (left.family !== undefined && SUPPRESSED_AFTER.has(left.family))
  ) {
    candidate = undefined;
  }

  const specialPriority = specialBehPriority(run, index);
  if (specialPriority === null) return undefined;
  if (specialPriority !== undefined) {
    return {
      priority: specialPriority,
      ruleId:
        specialPriority === 6 ? "naskh-before-ascending-tooth" : "naskh-before-high-medial-tooth",
    };
  }

  return candidate;
}

export function findPersianNaskhCandidates(text: string): readonly TatweelCandidate[] {
  const candidates: TatweelCandidate[] = [];

  for (const run of joinedRuns(clustersOf(text))) {
    for (let index = 0; index < run.length - 1; index += 1) {
      const current = run[index];
      const classification = classify(run, index);
      if (!current || !classification) continue;

      candidates.push({
        utf16Index: current.end,
        wordIndex: current.wordIndex,
        ...classification,
      });
    }
  }

  return candidates;
}

export const persianNaskhCandidateEngine: CandidateEngine = {
  findCandidates: findPersianNaskhCandidates,
};
