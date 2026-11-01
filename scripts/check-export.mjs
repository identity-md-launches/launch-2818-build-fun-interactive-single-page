import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import assert from "node:assert/strict";

const root = resolve(".");
const skip = new Set([
  ".git",
  ".github",
  ".imd",
  "node_modules",
  ".cache",
  ".vite",
  "coverage",
]);
const files = [];
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (skip.has(entry.name) || entry.isSymbolicLink()) continue;
    const path = resolve(folder, entry.name);
    if (path === resolve("test/scratch")) continue;
    if (entry.isDirectory()) await walk(path);
    else files.push({ path, size: (await stat(path)).size });
  }
}
await walk(root);
const total = files.reduce((sum, file) => sum + file.size, 0);
assert.ok(total <= 8388608, `Submission is ${total} bytes, over 8 MiB`);
assert.ok(
  (await stat(".gitignore")).size <= 512,
  "Ignore file exceeds its explicit 512-byte path budget",
);
assert.ok(
  files.every((f) => !/\.(tgz|zip|map|tsbuildinfo)$/.test(f.path)),
  "Unnecessary archives, source maps or build caches found",
);
const exportFiles = files.filter((f) =>
  f.path.startsWith(resolve("dist") + "/"),
);
assert.ok(exportFiles.length > 5, "Production export is incomplete");
const index = await readFile("dist/index.html", "utf8");
assert.match(index, /<title>Squeek Tales/);
for (const name of ["description", "og:title", "og:image"])
  assert.ok(index.includes(`="${name}"`), `Missing ${name}`);
const references = [];
for (const match of index.matchAll(/(?:src|href|content)="(\.\/?[^"<>]+)"/g))
  references.push({ from: resolve("dist/index.html"), url: match[1] });
for (const file of exportFiles.filter((f) => extname(f.path) === ".css")) {
  const css = await readFile(file.path, "utf8");
  for (const match of css.matchAll(/url\(([^)]+)\)/g))
    references.push({ from: file.path, url: match[1].replace(/["']/g, "") });
}
for (const { from, url } of references) {
  assert.ok(!url.startsWith("/"), `Absolute runtime asset URL: ${url}`);
  const target = resolve(dirname(from), decodeURIComponent(url));
  assert.ok(
    target.startsWith(resolve("dist") + "/"),
    `Asset escapes export: ${url}`,
  );
  assert.ok((await stat(target)).isFile(), `Missing asset ${url}`);
}
for (const required of [
  "nap.svg",
  "jog.svg",
  "zoomies.svg",
  "favicon.svg",
  "share.png",
])
  assert.ok((await stat(`dist/art/${required}`)).isFile());
console.log(
  JSON.stringify(
    {
      result: "pass",
      submissionFiles: files.length,
      submissionBytes: total,
      budgetBytes: 8388608,
      exportFiles: exportFiles.length,
      exportBytes: exportFiles.reduce((s, f) => s + f.size, 0),
      relativeReferencesChecked: references.length,
      ignoreBytes: (await stat(".gitignore")).size,
    },
    null,
    2,
  ),
);
