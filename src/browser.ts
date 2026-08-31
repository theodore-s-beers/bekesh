import { fitWithKashida } from "./solver.js";
import type {
  CandidateEngine,
  JustificationDiagnostic,
  JustificationResult,
  JustifyOptions,
  TextMeasurer,
} from "./types.js";

let measurementContext: CanvasRenderingContext2D | undefined;
let measurementFont: string | undefined;
let domMeasurementElement: HTMLSpanElement | undefined;

const MAXIMUM_DOM_REFITS = 128;
const REFIT_EPSILON = 1e-6;
const WORD_SPACING_SEARCH_STEPS = 32;
const WORD_SPACING_EPSILON = 1e-6;

function canvasContext(): CanvasRenderingContext2D {
  if (typeof document === "undefined") {
    throw new Error("justifyWithKashida requires a browser document");
  }

  if (!measurementContext) {
    measurementContext = document.createElement("canvas").getContext("2d") ?? undefined;
    if (measurementContext) {
      measurementContext.direction = "rtl";
    }
  }
  if (!measurementContext) {
    throw new Error("A 2D canvas context is unavailable");
  }
  return measurementContext;
}

export const canvasTextMeasurer: TextMeasurer = (text, font) => {
  const context = canvasContext();
  if (measurementFont !== font) {
    context.font = font;
    measurementFont = font;
  }
  return context.measureText(text).width;
};

function domElement(): HTMLSpanElement {
  if (typeof document === "undefined") {
    throw new Error("DOM text measurement requires a browser document");
  }

  if (!domMeasurementElement) {
    domMeasurementElement = document.createElement("span");
    const style = domMeasurementElement.style;
    style.position = "fixed";
    style.inset = "0 auto auto 0";
    style.display = "inline-block";
    style.visibility = "hidden";
    style.pointerEvents = "none";
    style.margin = "0";
    style.padding = "0";
    style.border = "0";
    style.direction = "rtl";
    style.whiteSpace = "pre";
    domMeasurementElement.setAttribute("aria-hidden", "true");
  }
  if (!domMeasurementElement.isConnected) {
    const root = document.body ?? document.documentElement;
    root.append(domMeasurementElement);
  }

  return domMeasurementElement;
}

function measureDomTextWithWordSpacing(text: string, font: string, wordSpacing: number): number {
  const element = domElement();
  element.style.font = font;
  element.style.wordSpacing = `${wordSpacing}px`;
  element.textContent = text;
  return element.getBoundingClientRect().width;
}

export function measureDomText(text: string, font: string): number {
  return measureDomTextWithWordSpacing(text, font, 0);
}

function uniqueDiagnostics(
  diagnostics: readonly JustificationDiagnostic[],
): JustificationDiagnostic[] {
  return [...new Set(diagnostics)];
}

function browserResult(
  result: JustificationResult,
  options: JustifyOptions,
  sourceWidth: number,
  measuredWidth: number,
  domAdjusted: boolean,
): JustificationResult {
  const remainingWidth = options.targetWidth - measuredWidth;
  const spaces = result.adjustableSpaceCount;
  let wordSpacing = remainingWidth > 0 && spaces > 0 ? remainingWidth / spaces : 0;
  let spacingAdjusted = false;

  if (wordSpacing > 0) {
    const permittedWidth = options.targetWidth + (options.tolerance ?? 0);
    const spacedWidth = measureDomTextWithWordSpacing(
      result.displayText,
      options.font,
      wordSpacing,
    );
    if (spacedWidth > permittedWidth) {
      spacingAdjusted = true;
      // Word spacing is additive in this single-line measurement. Correct by
      // the observed overflow, then verify in case the browser quantizes the
      // result unexpectedly.
      wordSpacing = Math.max(
        0,
        wordSpacing - (spacedWidth - permittedWidth) / spaces - WORD_SPACING_EPSILON,
      );

      if (
        measureDomTextWithWordSpacing(result.displayText, options.font, wordSpacing) >
        permittedWidth
      ) {
        let safe = 0;
        let unsafe = wordSpacing;
        for (let step = 0; step < WORD_SPACING_SEARCH_STEPS; step += 1) {
          const middle = (safe + unsafe) / 2;
          if (
            measureDomTextWithWordSpacing(result.displayText, options.font, middle) <=
            permittedWidth
          ) {
            safe = middle;
          } else {
            unsafe = middle;
          }
        }
        wordSpacing = safe;
      }
    }
  }

  const diagnostics: JustificationDiagnostic[] = result.diagnostics.filter(
    (diagnostic) =>
      diagnostic !== "source-overflows-target" && diagnostic !== "no-adjustable-spaces",
  );
  if (remainingWidth > (options.tolerance ?? 0) && spaces === 0) {
    diagnostics.push("no-adjustable-spaces");
  }
  if (domAdjusted || spacingAdjusted) {
    diagnostics.push("dom-verification-adjusted");
  }

  return {
    ...result,
    sourceWidth,
    measuredWidth,
    targetWidth: options.targetWidth,
    remainingWidth,
    wordSpacing,
    diagnostics: uniqueDiagnostics(diagnostics),
  };
}

export async function justifyWithKashida(
  options: JustifyOptions,
  candidateEngine?: CandidateEngine,
): Promise<JustificationResult> {
  if (typeof document === "undefined") {
    throw new Error("justifyWithKashida requires a browser document");
  }
  await document.fonts.load(options.font, options.text);

  const tolerance = options.tolerance ?? 0;
  const sourceWidth = measureDomText(options.text, options.font);
  let result = fitWithKashida(options, canvasTextMeasurer, candidateEngine);

  if (sourceWidth > options.targetWidth + tolerance) {
    return {
      ...result,
      displayText: options.text,
      sourceWidth,
      measuredWidth: sourceWidth,
      targetWidth: options.targetWidth,
      remainingWidth: options.targetWidth - sourceWidth,
      wordSpacing: 0,
      edits: [],
      diagnostics: ["source-overflows-target"],
    };
  }

  let internalTarget = options.targetWidth;
  let domAdjusted = false;
  for (let attempt = 0; attempt < MAXIMUM_DOM_REFITS; attempt += 1) {
    const domWidth = measureDomText(result.displayText, options.font);
    if (domWidth <= options.targetWidth + tolerance) {
      return browserResult(result, options, sourceWidth, domWidth, domAdjusted);
    }

    domAdjusted = true;
    internalTarget = Math.max(
      0,
      Math.min(
        internalTarget - (domWidth - options.targetWidth) - REFIT_EPSILON,
        result.measuredWidth - REFIT_EPSILON,
      ),
    );
    result = fitWithKashida(
      { ...options, targetWidth: internalTarget, tolerance: 0 },
      canvasTextMeasurer,
      candidateEngine,
    );
  }

  // The clean source was already verified to fit, so it is a safe final
  // fallback even if an unusual shaping engine defeats every bounded refit.
  return browserResult(
    {
      ...result,
      displayText: options.text,
      measuredWidth: canvasTextMeasurer(options.text, options.font),
      edits: [],
      diagnostics: [...result.diagnostics, "dom-verification-fallback"],
    },
    options,
    sourceWidth,
    measureDomText(options.text, options.font),
    true,
  );
}
