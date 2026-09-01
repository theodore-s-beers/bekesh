import assert from "node:assert/strict";
import test from "node:test";

import { findPersianNaskhCandidates } from "../dist/candidates.js";

const points = (text) =>
  findPersianNaskhCandidates(text).map(({ utf16Index, priority, ruleId, wordIndex }) => ({
    utf16Index,
    priority,
    ruleId,
    wordIndex,
  }));

test("applies the Naskh pair matrix with joined-run-length priorities", () => {
  assert.deepEqual(points("بط"), [
    {
      utf16Index: 1,
      priority: 7,
      ruleId: "naskh-matrix-recommended",
      wordIndex: 0,
    },
  ]);
  assert.deepEqual(points("مبط"), [
    {
      utf16Index: 2,
      priority: 8,
      ruleId: "naskh-matrix-recommended",
      wordIndex: 0,
    },
  ]);
  assert.deepEqual(
    points("ممبط").map(({ utf16Index, priority }) => ({ utf16Index, priority })),
    [
      { utf16Index: 1, priority: 3 },
      { utf16Index: 3, priority: 9 },
    ],
  );
  assert.deepEqual(points("بب"), []);
});

test("recognizes the special initial tooth contexts", () => {
  assert.deepEqual(
    points("ببب").map(({ utf16Index, priority, ruleId }) => ({ utf16Index, priority, ruleId })),
    [
      {
        utf16Index: 1,
        priority: 2,
        ruleId: "naskh-before-high-medial-tooth",
      },
    ],
  );
  assert.deepEqual(
    points("ببر").map(({ utf16Index, priority, ruleId }) => ({ utf16Index, priority, ruleId })),
    [
      {
        utf16Index: 1,
        priority: 6,
        ruleId: "naskh-before-ascending-tooth",
      },
      {
        utf16Index: 2,
        priority: 2,
        ruleId: "naskh-matrix-discouraged",
      },
    ],
  );
  assert.deepEqual(
    points("بببر").map(({ utf16Index, priority }) => ({ utf16Index, priority })),
    [{ utf16Index: 3, priority: 3 }],
  );
});

test("prefers final heh and enforces conservative Naskh suppressions", () => {
  assert.deepEqual(points("بحه"), [
    {
      utf16Index: 2,
      priority: 9,
      ruleId: "naskh-before-final-heh",
      wordIndex: 0,
    },
  ]);
  assert.deepEqual(points("سعي"), []);
  assert.deepEqual(points("سعی"), []);
  assert.deepEqual(points("الله"), []);
  assert.deepEqual(
    points("كلمة").map(({ utf16Index, ruleId }) => ({ utf16Index, ruleId })),
    [{ utf16Index: 3, ruleId: "naskh-before-final-heh" }],
  );
});

test("keeps marks with their base and treats a marked tatweel as a seat", () => {
  const markedBase = points("نَّام");
  assert.equal(markedBase[0]?.utf16Index, 3);
  assert.equal("نَّام".slice(0, markedBase[0]?.utf16Index), "نَّ");

  assert.deepEqual(
    points("هـٰذا").map(({ utf16Index, ruleId }) => ({ utf16Index, ruleId })),
    [{ utf16Index: 3, ruleId: "naskh-matrix-discouraged" }],
  );
  assert.deepEqual(points("بـَت"), []);
  assert.deepEqual(points("بـت"), [
    {
      utf16Index: 2,
      priority: 10,
      ruleId: "existing-tatweel",
      wordIndex: 0,
    },
  ]);
});

test("separates punctuation-delimited words but keeps ZWNJ compounds together", () => {
  assert.deepEqual(
    points("به،به").map(({ utf16Index, wordIndex }) => ({ utf16Index, wordIndex })),
    [
      { utf16Index: 1, wordIndex: 0 },
      { utf16Index: 4, wordIndex: 1 },
    ],
  );
  assert.deepEqual(
    points("به\u200cبه").map(({ utf16Index, wordIndex }) => ({ utf16Index, wordIndex })),
    [
      { utf16Index: 1, wordIndex: 0 },
      { utf16Index: 4, wordIndex: 0 },
    ],
  );
  assert.deepEqual(points("ب\u200cب"), []);
  assert.deepEqual(points("ب\u200dب"), []);
  assert.deepEqual(
    points("ب\u200dتم").map(({ utf16Index, priority }) => ({ utf16Index, priority })),
    [{ utf16Index: 3, priority: 5 }],
  );
  assert.deepEqual(points("دار"), []);
});

test("uses Unicode joining groups for Persian and newer Arabic letters", () => {
  assert.equal(
    points("گسترش").some(({ utf16Index }) => utf16Index === 1),
    false,
  );
  assert.deepEqual(
    points("یهتم").map(({ utf16Index, priority }) => ({ utf16Index, priority })),
    [
      { utf16Index: 1, priority: 6 },
      { utf16Index: 2, priority: 6 },
      { utf16Index: 3, priority: 6 },
    ],
  );
  assert.deepEqual(points("که"), []);
  assert.deepEqual(points("كه"), []);
  assert.deepEqual(points("ب\u0870"), [
    {
      utf16Index: 1,
      priority: 4,
      ruleId: "naskh-matrix-neutral",
      wordIndex: 0,
    },
  ]);
  assert.deepEqual(
    points("م\u{10ec3}م").map(({ utf16Index }) => utf16Index),
    [1, 3],
  );
});
