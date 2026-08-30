import assert from "node:assert/strict";
import test from "node:test";

import { findPersianNaskhCandidates } from "../dist/index.js";

test("finds connected Persian insertion points with ranked final forms", () => {
  assert.deepEqual(findPersianNaskhCandidates("بیت"), [
    {
      utf16Index: 1,
      wordIndex: 0,
      priority: 10,
      ruleId: "connected-general",
    },
    {
      utf16Index: 2,
      wordIndex: 0,
      priority: 50,
      ruleId: "before-connected-final",
    },
  ]);
});

test("places an insertion after the complete combining sequence", () => {
  const candidates = findPersianNaskhCandidates("نَّص");

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].utf16Index, 3);
  assert.equal("نَّص".slice(0, candidates[0].utf16Index), "نَّ");
});

test("does not cross lam-alef, ZWNJ, ZWJ, or right-joining boundaries", () => {
  assert.equal(
    findPersianNaskhCandidates("ملاعب").some((candidate) => candidate.utf16Index === 2),
    false,
  );
  assert.deepEqual(findPersianNaskhCandidates("ب\u200cب"), []);
  assert.deepEqual(findPersianNaskhCandidates("ب\u200dب"), []);
  assert.deepEqual(findPersianNaskhCandidates("دار"), []);
});

test("covers Persian letters outside simplistic Arabic ranges", () => {
  const candidates = findPersianNaskhCandidates("گسترش");

  assert.ok(candidates.length > 0);
  assert.ok(candidates.some((candidate) => candidate.ruleId === "after-seen-or-sad"));
});
