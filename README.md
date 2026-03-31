# Lignum Artifex

Static website for Lignum Artifex, a bespoke CNC woodworking shop. Built as a simple HTML/CSS/JS site for GitHub Pages hosting.

## Pages
- Home
- About (includes story content; blurred background image with overlay)
- Services (blurred background image with overlay; three service cards)
- Portfolio (formerly Photo Gallery)
- Contact (email/phone copy)

## Portfolio (Gallery) system
- Data source: `assets/data/gallery.json`
- Images: `assets/images/gallery/<category>/`
- Category display names and order are controlled by the `categories` array
- Category view: `gallery-category.html?cat=<id>`
- Current category IDs: `cabinetry`, `hobby`, `coach`, `milling`, `job`
- Current display order/titles: Cabinetry; Home & Hobby; Coach work; Custom Milling; Works In Progress

## Background images
- About background: `assets/images/about-bg.jpg`
- Services background: `assets/images/services-bg.jpg`
- Blur/overlay handled in CSS so text stays readable via overlay and translucent panels

## Run locally
- Open `index.html` directly, or use a simple static server (for example, VS Code Live Server).

## Update content
- Add images to `assets/images/gallery/<category>/`, then run the gallery generator to rebuild `assets/data/gallery.json`
- Replace background images by overwriting `assets/images/about-bg.jpg` or `assets/images/services-bg.jpg`
- Optional: add `assets/images/gallery/<category>/order.txt` to control image order. Put one filename per line. Any images not listed are appended automatically.

## VS Code Portfolio Workflow
Step 1: Drag photos into `assets/images/gallery/<category>/`.
Step 2: VS Code -> Run Task -> `Sync Portfolio`.
Step 3: Done.

## Easy ordering workflow
Step 1: Edit `assets/images/gallery/<category>/order.txt`.
Step 2: Double-click `update-gallery.bat`.
Step 3: Enter a commit message when prompted, or press Enter to use the default.
Step 4: The script rebuilds `assets/data/gallery.json`, commits only the gallery changes, and pushes them.
Step 5: If you start on `main`, the script creates a temporary `codex/gallery-update-...` branch and targets `main` through a pull request instead of pushing directly to `main`.
Step 6: If `gh` is installed and authenticated, the script creates or reuses a pull request and enables GitHub auto-merge when repo rules allow it.
Step 7: Review the final status in the batch window or on your Desktop in `gallery-sync-result.txt`.

Notes:
- `assets/data/gallery.json` is auto-generated. Never edit it manually.
- `order.txt` is optional and is the easiest way to manually control photo order in a category.
- The optimizer overwrites images in place (Git keeps history).
- The sync script stages only `assets/data/gallery.json` and files under `assets/images/gallery/`.
- When working outside the VS Code task, run `node scripts/build-gallery.mjs` before committing and pushing.
- Pull request automation requires GitHub CLI (`gh`) to be installed and authenticated.
- The Desktop status file is overwritten each run as `gallery-sync-result.txt` on your Windows Desktop.
- If auto-merge cannot be enabled, the script still preserves the pushed branch and prints the compare or PR URL for manual follow-up.

## Deploy (GitHub Pages)
- Push to the `main` branch.
- If Pages is already configured, GitHub will publish the site automatically.
- If not configured, enable Pages in repo settings and select `main` / root; use your published URL: `<YOUR_GITHUB_PAGES_URL>`

## Changelog (recent updates)
- Renamed Photo Gallery to Portfolio
- Updated portfolio category titles and display order
- Added blurred background images for About and Services
- Adjusted Services layout/content
