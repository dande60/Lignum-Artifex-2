import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GALLERY_DIR = path.join(ROOT, "assets", "images", "gallery");
const OUTPUT_PATH = path.join(ROOT, "assets", "data", "gallery.json");

const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

const toPosixPath = (value) => value.split(path.sep).join("/");

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

for (const category of categories) {
  const categoryDir = path.join(GALLERY_DIR, category);
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

  for (const filename of files) {
    const relativePath = toPosixPath(
      path.join("assets", "images", "gallery", category, filename)
    );
    photos.push({
      category,
      src: relativePath,
      filename,
    });
  }
}

const output = {
  categories,
  photos,
};

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
