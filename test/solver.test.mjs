import assert from "node:assert/strict";
import test from "node:test";

import { fitWithKashida, justifyWithKashida } from "../dist/index.js";

const additiveMeasurer = (text) =>
  [...text].reduce((width, character) => {
    if (character === "ـ") return width + 3;
    if (character === " ") return width + 5;
    return width + 10;
  }, 0);

test("rounds tatweel width down and returns word spacing for the remainder", () => {
  const result = fitWithKashida(
    {
      text: "متن متن",
      targetWidth: 75,
      font: '20px "Scheherazade New"',
    },
    additiveMeasurer,
  );

  assert.equal(result.sourceWidth, 65);
  assert.equal(result.measuredWidth, 74);
  assert.equal(result.remainingWidth, 1);
  assert.equal(result.adjustableSpaceCount, 1);
  assert.equal(result.wordSpacing, 1);
  assert.equal(result.displayText, "متــن متـن");
  assert.deepEqual(
    result.edits.map(({ utf16Index, count }) => ({ utf16Index, count })),
    [
      { utf16Index: 2, count: 2 },
      { utf16Index: 6, count: 1 },
    ],
  );
});

test("leaves an unavoidable residual when the text has no spaces", () => {
  const result = fitWithKashida(
    { text: "متن", targetWidth: 34, font: "20px serif" },
    additiveMeasurer,
  );

  assert.equal(result.displayText, "متـن");
  assert.equal(result.remainingWidth, 1);
  assert.equal(result.wordSpacing, 0);
  assert.ok(result.diagnostics.includes("no-adjustable-spaces"));
});

test("does not shrink or add tatweels when the source already overflows", () => {
  const result = fitWithKashida(
    { text: "متن", targetWidth: 20, font: "20px serif" },
    additiveMeasurer,
  );

  assert.equal(result.displayText, result.sourceText);
  assert.equal(result.wordSpacing, 0);
  assert.equal(result.remainingWidth, -10);
  assert.deepEqual(result.edits, []);
  assert.ok(result.diagnostics.includes("source-overflows-target"));
});

test("tries a lower-priority point when its contextual gain fits", () => {
  const candidateEngine = {
    findCandidates: () => [
      { utf16Index: 1, wordIndex: 0, priority: 100, ruleId: "wide" },
      { utf16Index: 2, wordIndex: 0, priority: 50, ruleId: "narrow" },
    ],
  };
  const contextualMeasurer = (text) => {
    const base = [...text].filter((character) => character !== "ـ").length * 10;
    if (text.startsWith("اـ")) return base + 5;
    return base + [...text].filter((character) => character === "ـ").length * 2;
  };

  const result = fitWithKashida(
    { text: "اب", targetWidth: 22, font: "20px serif" },
    contextualMeasurer,
    candidateEngine,
  );

  assert.equal(result.displayText, "ابـ");
  assert.equal(result.measuredWidth, 22);
  assert.equal(result.edits[0].ruleId, "narrow");
});

test("rejects candidates whose inserted tatweel has no measurable gain", () => {
  const result = fitWithKashida(
    { text: "متن", targetWidth: 100, font: "20px serif" },
    (text) => [...text].filter((character) => character !== "ـ").length * 10,
  );

  assert.equal(result.displayText, "متن");
  assert.deepEqual(result.edits, []);
});

test("the convenience API reports its browser-only requirement", async () => {
  await assert.rejects(
    justifyWithKashida({ text: "متن", targetWidth: 100, font: "20px serif" }),
    /browser document/,
  );
});

test("validates target width and font input", () => {
  assert.throws(
    () => fitWithKashida({ text: "متن", targetWidth: -1, font: "20px serif" }, additiveMeasurer),
    RangeError,
  );
  assert.throws(
    () => fitWithKashida({ text: "متن", targetWidth: 30, font: " " }, additiveMeasurer),
    TypeError,
  );
});
