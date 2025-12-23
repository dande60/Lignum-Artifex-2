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
]);
const IGNORED_NAMES = new Set([".gitkeep", "placeholder.png"]);

const toPosixPath = (value) => value.split(path.sep).join("/");

const toLower = (value) => value.toLowerCase();
const normalizePath = (value) =>
  typeof value === "string" ? value.replace(/^\/+/, "") : value;

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
  toLower(filename.replace(/\.[^.]+$/, "")) === "cover";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const compareNewestFirst = (a, b) =>
  b.mtimeMs - a.mtimeMs || collator.compare(a.name, b.name);

const warnings = [];
const counts = {
  supported: 0,
  ignored: 0,
  ignoredHeic: 0,
  ignoredCover: 0,
  ignoredPlaceholder: 0,
  ignoredGitkeep: 0,
  ignoredUnsupported: 0,
};

let data = {};
try {
  const raw = await fs.readFile(GALLERY_JSON, "utf8");
  data = JSON.parse(raw);
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}
const existingCategories = Array.isArray(data.categories) ? data.categories : [];
const existingById = new Map(
  existingCategories
    .filter((category) => category && typeof category === "object")
    .map((category) => [category.id, category])
);
const categories = [];
const photos = [];

let categoryEntries = [];
try {
  categoryEntries = await fs.readdir(GALLERY_DIR, { withFileTypes: true });
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

const categoryIds = categoryEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => collator.compare(a, b));

for (const categoryId of categoryIds) {
  const categoryDir = path.join(GALLERY_DIR, categoryId);
  const existing = existingById.get(categoryId);
  let cover = "";

  let entries;
  try {
    entries = await fs.readdir(categoryDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      continue;
    }
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    const nameLower = toLower(name);
    const extLower = toLower(path.extname(name));

    if (IGNORED_NAMES.has(nameLower)) {
      counts.ignored++;
      if (nameLower === "placeholder.png") counts.ignoredPlaceholder++;
      if (nameLower === ".gitkeep") counts.ignoredGitkeep++;
      continue;
    }

    if (extLower === ".heic") {
      counts.ignored++;
      counts.ignoredHeic++;
      warnings.push(`Ignored unsupported HEIC file: ${categoryId}/${name}`);
      continue;
    }

    if (!SUPPORTED_EXTS.has(extLower)) {
      counts.ignored++;
      counts.ignoredUnsupported++;
      warnings.push(`Ignored unsupported file: ${categoryId}/${name}`);
      continue;
    }

    const relativePath = toPosixPath(
      path.join("assets", "images", "gallery", categoryId, name)
    );

    if (isCoverImage(name)) {
      counts.ignored++;
      counts.ignoredCover++;
      cover = relativePath;
      continue;
    }

    const fullPath = path.join(categoryDir, name);
    const stat = await fs.stat(fullPath);
    files.push({ name, mtimeMs: stat.mtimeMs, relativePath });
    counts.supported++;
  }

  files.sort(compareNewestFirst);

  if (!cover && files.length > 0) {
    cover = files[0].relativePath;
  }

  const categoryTitle = titleCase(
    categoryId.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  );
  categories.push({
    ...(existing && typeof existing === "object" ? existing : {}),
    id: categoryId,
    title: categoryTitle,
    cover: normalizePath(cover || existing?.cover || ""),
  });

  for (const { name: filename, relativePath } of files) {
    const src = relativePath;
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
  categories,
  photos,
};

const json = `${JSON.stringify(output, null, 2)}\n`;
await fs.mkdir(path.dirname(GALLERY_JSON), { recursive: true });
await fs.writeFile(GALLERY_JSON, json, "utf8");

const summary = [
  `Gallery sync complete.`,
  `Included: ${counts.supported}`,
  `Ignored: ${counts.ignored}`,
  `Ignored (cover): ${counts.ignoredCover}`,
  `Ignored (placeholder): ${counts.ignoredPlaceholder}`,
  `Ignored (.gitkeep): ${counts.ignoredGitkeep}`,
  `Ignored (heic): ${counts.ignoredHeic}`,
  `Ignored (unsupported): ${counts.ignoredUnsupported}`,
];
console.log(summary.join(" "));
for (const warning of warnings) {
  console.warn(warning);
}
