import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GALLERY_JSON = path.join(ROOT, "assets", "data", "gallery.json");
const GALLERY_DIR = path.join(ROOT, "assets", "images", "gallery");
const SUPPORTED_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

const toPosixPath = (value) => value.split(path.sep).join("/");

const titleCase = (value) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const deriveTitle = (filename) => {
  const base = filename.replace(/\.[^.]+$/, "");
  const spaced = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return titleCase(spaced);
};

const isCoverImage = (filename) =>
  filename.replace(/\.[^.]+$/, "").toLowerCase() === "cover";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

let raw;
try {
  raw = await fs.readFile(GALLERY_JSON, "utf8");
} catch (error) {
  throw new Error(
    `Missing gallery data file at ${GALLERY_JSON}. Please create it with categories before running this script.`,
    { cause: error }
  );
}

const data = JSON.parse(raw);
const categories = Array.isArray(data.categories) ? data.categories : [];
const photos = [];

for (const category of categories) {
  const categoryId = category?.id;
  if (!categoryId) continue;
  const categoryDir = path.join(GALLERY_DIR, categoryId);

  let entries;
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
    .filter((name) => !isCoverImage(name))
    .sort((a, b) => collator.compare(a, b));

  for (const filename of files) {
    const relativePath = toPosixPath(
      path.join("assets", "images", "gallery", categoryId, filename)
    );
    const src = `/${relativePath}`;
    photos.push({
      src,
      thumb: src,
      category: categoryId,
      title: deriveTitle(filename),
    });
  }
}

const output = {
  ...data,
  categories: data.categories,
  photos,
};

const json = `${JSON.stringify(output, null, 2)}\n`;
await fs.writeFile(GALLERY_JSON, json, "utf8");
