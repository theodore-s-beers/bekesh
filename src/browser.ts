import { fitWithKashida } from "./solver.js";
import type {
  CandidateEngine,
  JustificationResult,
  JustifyOptions,
  TextMeasurer,
} from "./types.js";

let measurementContext: CanvasRenderingContext2D | undefined;

function canvasContext(): CanvasRenderingContext2D {
  if (typeof document === "undefined") {
    throw new Error("justifyWithKashida requires a browser document");
  }

  measurementContext ??= document.createElement("canvas").getContext("2d") ?? undefined;
  if (!measurementContext) {
    throw new Error("A 2D canvas context is unavailable");
  }
  return measurementContext;
}

export const canvasTextMeasurer: TextMeasurer = (text, font) => {
  const context = canvasContext();
  context.font = font;
  context.direction = "rtl";
  return context.measureText(text).width;
};

export async function justifyWithKashida(
  options: JustifyOptions,
  candidateEngine?: CandidateEngine,
): Promise<JustificationResult> {
  if (typeof document === "undefined") {
    throw new Error("justifyWithKashida requires a browser document");
  }
  await document.fonts.load(options.font, options.text);
  return fitWithKashida(options, canvasTextMeasurer, candidateEngine);
}
