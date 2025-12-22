import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const GALLERY_JSON = "assets/data/gallery.json";
const STAGE_CANDIDATES = [GALLERY_JSON, "scripts/build-gallery.mjs", "README.md"];

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
};

const runCapture = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
  return result.stdout.trim();
};

const getGitDir = () => runCapture("git", ["rev-parse", "--git-dir"]);

const isRebaseInProgress = () => {
  const gitDir = getGitDir();
  return (
    fs.existsSync(path.join(gitDir, "rebase-merge")) ||
    fs.existsSync(path.join(gitDir, "rebase-apply"))
  );
};

const getStatusLines = (filePath) => {
  const output = runCapture("git", ["status", "--porcelain", "--", filePath]);
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
};

const hasGalleryConflict = () =>
  getStatusLines(GALLERY_JSON).some((line) => line.startsWith("UU "));

const resolveGalleryConflict = () => {
  run("git", ["checkout", "--theirs", "--", GALLERY_JSON]);
  run("git", ["add", GALLERY_JSON]);
};

const continueRebase = () => {
  const result = spawnSync("git", ["rebase", "--continue"], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Rebase failed. Resolve remaining conflicts and continue.");
  }
};

const pullRebase = () => {
  const result = spawnSync("git", ["pull", "--rebase"], { stdio: "inherit" });
  if (result.status === 0) return;
  if (!isRebaseInProgress()) {
    throw new Error("git pull --rebase failed.");
  }

  while (isRebaseInProgress()) {
    if (hasGalleryConflict()) {
      resolveGalleryConflict();
      continueRebase();
      continue;
    }
    throw new Error(
      "Rebase stopped due to conflicts outside assets/data/gallery.json. Resolve manually, then re-run."
    );
  }
};

pullRebase();
run("node", ["scripts/build-gallery.mjs"]);

for (const filePath of STAGE_CANDIDATES) {
  if (getStatusLines(filePath).length > 0) {
    run("git", ["add", "--", filePath]);
  }
}

const staged = runCapture("git", ["diff", "--cached", "--name-only"]);
if (!staged) {
  console.log("Nothing to commit.");
  process.exit(0);
}

run("git", ["commit", "-m", "Sync portfolio gallery"]);
run("git", ["push"]);