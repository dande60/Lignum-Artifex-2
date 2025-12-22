import { spawnSync } from "node:child_process";

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

run("node", ["scripts/optimize-images.mjs"]);
run("node", ["scripts/build-gallery.mjs"]);
run("git", ["add", "-A"]);

const status = runCapture("git", ["status", "--porcelain"]);
if (!status) {
  console.log("Nothing to commit.");
  process.exit(0);
}

run("git", ["commit", "-m", "Update portfolio"]);
run("git", ["push", "origin", "main"]);