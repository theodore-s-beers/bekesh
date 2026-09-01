import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/831b58ab22a076d54104f7a71fa6f00bd956fc50/ofl/scheherazadenew/ScheherazadeNew-Regular.ttf";
const FONT_SHA256 = "794bac8dc9e83d1d620bc471ea694f5f31d0965ce8006490a79dfc51a2d283b3";
const TARGET_WIDTH = 256;
const FILL_EPSILON = 0.125;
const dirname = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(dirname, "..");
const require = createRequire(import.meta.url);

const samples = [
  { lang: "fa", text: "به نام خداوند جان و خرد" },
  { lang: "fa", text: "کزین برتر اندیشه برنگذرد" },
  { lang: "fa", text: "خداوند نام و خداوند جای" },
  { lang: "fa", text: "خداوند روزی ده رهنمای" },
  { lang: "fa", text: "می‌دانم که ایران سرای من است" },
  { lang: "fa", text: "توانا بود هر که دانا بود" },
  { lang: "fa", text: "ز دانش دل پیر برنا بود" },
  { lang: "fa", text: "چو ایران نباشد تن من مباد" },
  { lang: "fa", text: "بدین بوم و بر زنده یک تن مباد" },
  { lang: "fa", text: "همه سر به سر تن به کشتن دهیم" },
  { lang: "fa", text: "از آن به که کشور به دشمن دهیم" },
  { lang: "ar", text: "قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ" },
  { lang: "ar", text: "على قدر أهل العزم تأتي العزائم" },
  { lang: "ar", text: "إذا غامرت في شرف مروم" },
];
const fontSizes = [16, 16.1, 20, 22.3, 29.1];

function loadSystemPlaywright() {
  const candidates = [];
  if (process.env.BEKESH_PLAYWRIGHT_PATH) {
    candidates.push(process.env.BEKESH_PLAYWRIGHT_PATH);
  }

  try {
    const cli = execFileSync("volta", ["which", "playwright"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    candidates.push(path.resolve(path.dirname(cli), "../lib/node_modules/playwright"));
  } catch {
    // A non-Volta global installation may still be available below.
  }

  try {
    const globalRoot = execFileSync("npm", ["root", "--global"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    candidates.push(path.join(globalRoot, "playwright"));
  } catch {
    // Report one actionable error after trying every supported installation.
  }

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next system installation.
    }
  }

  throw new Error(
    "System Playwright was not found. Run `volta install playwright` or set BEKESH_PLAYWRIGHT_PATH.",
  );
}

async function fontFixture() {
  const directory = path.join(tmpdir(), "bekesh-browser-tests");
  const filename = path.join(directory, "ScheherazadeNew-Regular.ttf");
  await mkdir(directory, { recursive: true });

  let data;
  try {
    data = await readFile(filename);
  } catch {
    // Download below.
  }

  if (!data || createHash("sha256").update(data).digest("hex") !== FONT_SHA256) {
    const response = await fetch(FONT_URL);
    if (!response.ok) {
      throw new Error(`Could not download the test font: ${response.status}`);
    }
    data = Buffer.from(await response.arrayBuffer());
    await writeFile(filename, data);
  }

  const digest = createHash("sha256").update(data).digest("hex");
  assert.equal(digest, FONT_SHA256, "The cached test font does not match its pinned digest");
  return filename;
}

function startServer(fontPath) {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(`<style>
        @font-face{font-family:"Scheherazade Test";src:url(/font.ttf)}
        @font-face{font-family:"Scheherazade Split";src:url(/font-base.ttf);unicode-range:U+0000-063F,U+0641-10FFFF}
        @font-face{font-family:"Scheherazade Split";src:url(/font-tatweel.ttf);unicode-range:U+0640}
        body{margin:0}
      </style>`);
      return;
    }
    if (["/font.ttf", "/font-base.ttf", "/font-tatweel.ttf"].includes(pathname)) {
      response.setHeader("content-type", "font/ttf");
      createReadStream(fontPath).pipe(response);
      return;
    }
    if (pathname.startsWith("/dist/")) {
      const filename = path.join(repository, pathname.slice(1));
      const dist = path.join(repository, "dist") + path.sep;
      if (!filename.startsWith(dist)) {
        response.statusCode = 403;
        response.end();
        return;
      }
      response.setHeader("content-type", "text/javascript; charset=utf-8");
      createReadStream(filename)
        .on("error", () => {
          response.statusCode = 404;
          response.end();
        })
        .pipe(response);
      return;
    }
    response.statusCode = 404;
    response.end();
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address !== "string");
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function runBrowser(browserName, browserType, origin) {
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(origin);
    const {
      cssIsolation,
      rows: report,
      tatweelSubsetRequested,
    } = await page.evaluate(
      async ({ browserName, fontSizes, origin, samples, targetWidth }) => {
        const { justifyWithKashida, measureDomText } = await import(`${origin}/dist/index.js`);
        await justifyWithKashida({
          text: "سلام",
          targetWidth: 1,
          font: '20px "Scheherazade Split"',
        });
        const tatweelSubsetRequested = performance
          .getEntriesByType("resource")
          .some((entry) => new URL(entry.name).pathname === "/font-tatweel.ttf");
        const isolationFont = '20px "Scheherazade Test"';
        const isolationText = "سلام";
        await document.fonts.load(isolationFont, isolationText);
        const hostileStyle = document.createElement("style");
        hostileStyle.textContent = `
          span,
          body > div {
            font: 80px serif !important;
            font-feature-settings: "kern" 0 !important;
            letter-spacing: 17px !important;
            transform: scaleX(2) !important;
            zoom: 2 !important;
          }
        `;
        document.head.append(hostileStyle);
        const widthWithHostileCssAtCreation = measureDomText(isolationText, isolationFont);
        hostileStyle.remove();
        const widthWithoutHostileCss = measureDomText(isolationText, isolationFont);
        const explicitPersianWidth = measureDomText(isolationText, isolationFont, "fa");
        document.head.append(hostileStyle);
        const widthWithHostileCssAfterCreation = measureDomText(isolationText, isolationFont);
        hostileStyle.remove();
        const rows = [];

        for (const fontSize of fontSizes) {
          const font = `${fontSize}px "Scheherazade Test"`;
          await document.fonts.load(font, samples.map(({ text }) => text).join(""));

          for (const { lang, text } of samples) {
            const sourceWidth = measureDomText(text, font, lang);
            const sourceReference = document.createElement("span");
            sourceReference.lang = lang;
            sourceReference.style.cssText = `position:absolute;display:inline-block;white-space:pre;direction:rtl;font:${font};word-spacing:0`;
            sourceReference.textContent = text;
            document.body.append(sourceReference);
            const sourceReferenceWidth = sourceReference.getBoundingClientRect().width;
            sourceReference.remove();

            const result = await justifyWithKashida({ text, targetWidth, font, lang });
            const span = document.createElement("span");
            span.lang = lang;
            span.style.cssText = `position:absolute;display:inline-block;white-space:pre;direction:rtl;font:${font};word-spacing:${result.wordSpacing}px`;
            span.textContent = result.displayText;
            document.body.append(span);
            const renderedWidth = span.getBoundingClientRect().width;
            span.remove();

            const zeroSpacing = document.createElement("span");
            zeroSpacing.lang = lang;
            zeroSpacing.style.cssText = `position:absolute;display:inline-block;white-space:pre;direction:rtl;font:${font};word-spacing:0`;
            zeroSpacing.textContent = result.displayText;
            document.body.append(zeroSpacing);
            const measuredWidth = zeroSpacing.getBoundingClientRect().width;
            zeroSpacing.remove();

            const container = document.createElement("div");
            container.lang = lang;
            container.style.cssText = `position:absolute;width:${targetWidth}px;direction:rtl;font:${font};line-height:1.5;word-spacing:${result.wordSpacing}px`;
            container.textContent = result.displayText;
            document.body.append(container);
            const range = document.createRange();
            range.selectNodeContents(container);
            const lineTops = new Set(
              [...range.getClientRects()].map((rectangle) => Math.round(rectangle.top * 64)),
            );
            container.remove();

            rows.push({
              browserName,
              fontSize,
              lang,
              text,
              sourceWidth,
              sourceReferenceWidth,
              renderedWidth,
              measuredWidth,
              lineCount: lineTops.size,
              result,
            });
          }
        }
        return {
          cssIsolation: {
            widthWithHostileCssAtCreation,
            widthWithoutHostileCss,
            widthWithHostileCssAfterCreation,
            explicitPersianWidth,
          },
          tatweelSubsetRequested,
          rows,
        };
      },
      { browserName, fontSizes, origin, samples, targetWidth: TARGET_WIDTH },
    );

    assert.ok(
      Math.abs(cssIsolation.widthWithHostileCssAtCreation - cssIsolation.widthWithoutHostileCss) <
        0.001,
      `${browserName} allowed pre-existing page CSS to alter DOM measurement`,
    );
    assert.ok(
      Math.abs(cssIsolation.explicitPersianWidth - cssIsolation.widthWithoutHostileCss) < 0.001,
      `${browserName} did not default DOM measurement to Persian`,
    );
    assert.ok(
      Math.abs(
        cssIsolation.widthWithHostileCssAfterCreation - cssIsolation.widthWithoutHostileCss,
      ) < 0.001,
      `${browserName} allowed later page CSS to alter DOM measurement`,
    );
    assert.ok(
      tatweelSubsetRequested,
      `${browserName} did not load the unicode-range subset containing U+0640`,
    );

    let fitted = 0;
    let sourceOverflows = 0;
    let adjusted = 0;
    for (const row of report) {
      assert.ok(
        Math.abs(row.sourceWidth - row.sourceReferenceWidth) < 0.001,
        `${browserName} returned an inaccurate DOM width for ${row.text}`,
      );
      assert.ok(
        Math.abs(row.sourceWidth - row.result.sourceWidth) < 0.001,
        `${browserName} returned an inconsistent sourceWidth for ${row.text}`,
      );
      assert.ok(
        Math.abs(row.measuredWidth - row.result.measuredWidth) < 0.001,
        `${browserName} returned a non-DOM measuredWidth for ${row.text}`,
      );

      if (row.result.diagnostics.includes("source-overflows-target")) {
        sourceOverflows += 1;
        assert.ok(row.result.sourceWidth > TARGET_WIDTH);
        assert.equal(row.result.displayText, row.result.sourceText);
        assert.equal(row.result.wordSpacing, 0);
        continue;
      }

      fitted += 1;
      if (row.result.diagnostics.includes("dom-verification-adjusted")) {
        adjusted += 1;
      }
      assert.ok(
        row.renderedWidth <= TARGET_WIDTH,
        `${browserName} overflowed by ${row.renderedWidth - TARGET_WIDTH}px at ${row.fontSize}px: ${row.text}`,
      );
      assert.ok(
        TARGET_WIDTH - row.renderedWidth <= FILL_EPSILON,
        `${browserName} underfilled by ${TARGET_WIDTH - row.renderedWidth}px at ${row.fontSize}px: ${row.text}`,
      );
      assert.equal(
        row.lineCount,
        1,
        `${browserName} wrapped fitted text at ${row.fontSize}px: ${row.text}`,
      );
    }

    return { browserName, total: report.length, fitted, sourceOverflows, adjusted };
  } finally {
    await browser.close();
  }
}

const { chromium, firefox, webkit } = loadSystemPlaywright();
const fontPath = await fontFixture();
const { server, origin } = await startServer(fontPath);
try {
  const reports = [
    await runBrowser("chromium", chromium, origin),
    await runBrowser("firefox", firefox, origin),
    await runBrowser("webkit", webkit, origin),
  ];
  console.log(JSON.stringify(reports, null, 2));
} finally {
  server.close();
}
