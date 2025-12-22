import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const GALLERY_DIR = path.join(ROOT, "assets", "images", "gallery");
const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const IGNORED_NAMES = new Set([".gitkeep", "placeholder.png"]);

const toLower = (value) => value.toLowerCase();

const isCoverImage = (filename) =>
  toLower(filename.replace(/\.[^.]+$/, "")) === "cover";

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value < 10 && index > 0 ? 2 : 1)} ${units[index]}`;
};

const walkDir = async (dir) => {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

const optimizeImage = async (filePath, extLower) => {
  const input = sharp(filePath, { failOn: "none" });
  let pipeline = input;

  if (extLower === ".jpg" || extLower === ".jpeg") {
    pipeline = pipeline.resize({ width: 2200, withoutEnlargement: true });
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  } else if (extLower === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
  } else if (extLower === ".webp") {
    pipeline = pipeline.resize({ width: 2200, withoutEnlargement: true });
    pipeline = pipeline.webp({ quality: 80 });
  }

  return pipeline.toBuffer();
};

const allFiles = await walkDir(GALLERY_DIR);

let totalScanned = 0;
let totalOptimized = 0;
let totalBytesSaved = 0;
const warnings = [];

for (const filePath of allFiles) {
  totalScanned += 1;
  const name = path.basename(filePath);
  const nameLower = toLower(name);
  const extLower = toLower(path.extname(name));

  if (IGNORED_NAMES.has(nameLower)) {
    continue;
  }

  if (isCoverImage(name)) {
    continue;
  }

  if (extLower === ".heic") {
    warnings.push(`Ignored unsupported HEIC file: ${filePath}`);
    continue;
  }

  if (!SUPPORTED_EXTS.has(extLower)) {
    warnings.push(`Ignored unsupported file: ${filePath}`);
    continue;
  }

  const beforeStat = await fs.stat(filePath);
  const optimizedBuffer = await optimizeImage(filePath, extLower);
  await fs.writeFile(filePath, optimizedBuffer);
  const afterStat = await fs.stat(filePath);

  const saved = Math.max(0, beforeStat.size - afterStat.size);
  totalBytesSaved += saved;
  totalOptimized += 1;
}

console.log(
  `Image optimization complete. Scanned: ${totalScanned} Optimized: ${totalOptimized} Bytes saved: ${formatBytes(totalBytesSaved)}`
);

for (const warning of warnings) {
  console.warn(warning);
}