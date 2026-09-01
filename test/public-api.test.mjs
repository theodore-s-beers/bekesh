import assert from "node:assert/strict";
import test from "node:test";

import * as bekesh from "../dist/index.js";

test("exposes a focused public runtime API", () => {
  assert.deepEqual(Object.keys(bekesh), ["justifyWithKashida", "measureDomText"]);
});
