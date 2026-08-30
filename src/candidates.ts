import {
  acceptsConnectionFromPrevious,
  connectsToFollowing,
  isArabicJoiningCharacter,
} from "./joining.js";
import type { CandidateEngine, TatweelCandidate } from "./types.js";

interface Cluster {
  text: string;
  index: number;
  end: number;
  base: string | undefined;
  wordIndex: number;
}

const segmenter = new Intl.Segmenter("fa", { granularity: "grapheme" });

const SEEN_OR_SAD = new Set(["س", "ش", "ص", "ض"]);
const FINAL_HEH_OR_DAL = new Set(["ة", "ه", "ۀ", "ە", "د", "ذ"]);
const FINAL_ALEF_TAH_LAM_KAF = new Set(["آ", "أ", "إ", "ا", "ٱ", "ط", "ظ", "ل", "ك", "ک", "گ"]);
const FINAL_WAW_AIN_QAF_FEH = new Set(["ؤ", "و", "ع", "غ", "ف", "ڤ", "ق"]);
const ALEF = new Set(["آ", "أ", "إ", "ا", "ٱ"]);

function clusterBase(text: string): string | undefined {
  return [...text].find(isArabicJoiningCharacter);
}

function clustersOf(text: string): Cluster[] {
  const clusters: Cluster[] = [];
  let wordIndex = -1;
  let inWord = false;

  for (const part of segmenter.segment(text)) {
    const whitespace = /^\s+$/u.test(part.segment);
    if (whitespace) {
      inWord = false;
    } else if (!inWord) {
      wordIndex += 1;
      inWord = true;
    }

    clusters.push({
      text: part.segment,
      index: part.index,
      end: part.index + part.segment.length,
      base: clusterBase(part.segment),
      wordIndex,
    });
  }

  return clusters;
}

function isConnection(left: Cluster | undefined, right: Cluster | undefined) {
  if (
    !left?.base ||
    !right?.base ||
    left.wordIndex !== right.wordIndex ||
    left.text.includes("\u200c") ||
    left.text.includes("\u200d") ||
    right.text.includes("\u200c") ||
    right.text.includes("\u200d")
  ) {
    return false;
  }

  return connectsToFollowing(left.base) && acceptsConnectionFromPrevious(right.base);
}

function classify(
  clusters: readonly Cluster[],
  index: number,
): Pick<TatweelCandidate, "priority" | "ruleId"> {
  const current = clusters[index];
  const next = clusters[index + 1];
  if (!current?.base || !next?.base) {
    return { priority: 10, ruleId: "connected-general" };
  }

  const nextIsFinal = !isConnection(next, clusters[index + 2]);

  if (current.base === "ـ") {
    return { priority: 100, ruleId: "existing-tatweel" };
  }
  if (SEEN_OR_SAD.has(current.base)) {
    return { priority: 90, ruleId: "after-seen-or-sad" };
  }
  if (nextIsFinal && FINAL_HEH_OR_DAL.has(next.base)) {
    return { priority: 80, ruleId: "before-final-heh-or-dal" };
  }
  if (nextIsFinal && FINAL_ALEF_TAH_LAM_KAF.has(next.base)) {
    return { priority: 70, ruleId: "before-final-alef-tah-lam-kaf" };
  }
  if (nextIsFinal && FINAL_WAW_AIN_QAF_FEH.has(next.base)) {
    return { priority: 60, ruleId: "before-final-waw-ain-qaf-feh" };
  }
  if (nextIsFinal) {
    return { priority: 50, ruleId: "before-connected-final" };
  }
  return { priority: 10, ruleId: "connected-general" };
}

export function findPersianNaskhCandidates(text: string): readonly TatweelCandidate[] {
  const clusters = clustersOf(text);
  const candidates: TatweelCandidate[] = [];

  for (let index = 0; index < clusters.length - 1; index += 1) {
    const current = clusters[index];
    const next = clusters[index + 1];
    if (!current || !next || !isConnection(current, next)) {
      continue;
    }

    // Inserting between lam and alef breaks a required shaping sequence.
    if (current.base === "ل" && next.base && ALEF.has(next.base)) {
      continue;
    }

    candidates.push({
      utf16Index: current.end,
      wordIndex: current.wordIndex,
      ...classify(clusters, index),
    });
  }

  return candidates;
}

export const persianNaskhCandidateEngine: CandidateEngine = {
  findCandidates: findPersianNaskhCandidates,
};
