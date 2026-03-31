import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GALLERY_DIR = path.join(ROOT, "assets", "images", "gallery");
const OUTPUT_PATH = path.join(ROOT, "assets", "data", "gallery.json");

const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

const toPosixPath = (value) => value.split(path.sep).join("/");

async function updateLatestModified(targetPath, currentLatest) {
  try {
    const stats = await fs.stat(targetPath);
    return Math.max(currentLatest, stats.mtimeMs);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return currentLatest;
    }
    throw error;
  }
}

async function readOrderFile(categoryDir) {
  const orderPath = path.join(categoryDir, "order.txt");

  try {
    const raw = await fs.readFile(orderPath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

let categoryEntries = [];
try {
  categoryEntries = await fs.readdir(GALLERY_DIR, { withFileTypes: true });
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

const categories = categoryEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => collator.compare(a, b));

const photos = [];
let latestModifiedMs = 0;

for (const category of categories) {
  const categoryDir = path.join(GALLERY_DIR, category);
  latestModifiedMs = await updateLatestModified(
    path.join(categoryDir, "order.txt"),
    latestModifiedMs
  );
  let entries = [];

  try {
    entries = await fs.readdir(categoryDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      continue;
    }
    throw error;
  }

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => SUPPORTED_EXTS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => collator.compare(a, b));

  const listedOrder = await readOrderFile(categoryDir);
  const orderedFiles = [];
  const seen = new Set();

  for (const filename of listedOrder) {
    if (files.includes(filename) && !seen.has(filename)) {
      orderedFiles.push(filename);
      seen.add(filename);
    }
  }

  for (const filename of files) {
    if (!seen.has(filename)) {
      orderedFiles.push(filename);
      seen.add(filename);
    }
  }

  for (const [index, filename] of orderedFiles.entries()) {
    latestModifiedMs = await updateLatestModified(
      path.join(categoryDir, filename),
      latestModifiedMs
    );
    const relativePath = toPosixPath(
      path.join("assets", "images", "gallery", category, filename)
    );
    photos.push({
      category,
      src: relativePath,
      filename,
      order: index + 1,
    });
  }
}

const output = {
  categories,
  version: latestModifiedMs ? String(Math.trunc(latestModifiedMs)) : null,
  photos,
};

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
