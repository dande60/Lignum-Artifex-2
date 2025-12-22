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
- Edit portfolio categories/titles/order in `assets/data/gallery.json`
- Add images to `assets/images/gallery/<category>/`, then run the gallery generator to rebuild `assets/data/gallery.json`
- Replace background images by overwriting `assets/images/about-bg.jpg` or `assets/images/services-bg.jpg`

## Portfolio Photo Workflow (VS Code only)
Step 1: Drop photos into `assets/images/gallery/<category>/`.
Step 2: Run `npm run gallery:sync` (or run `scripts/sync-portfolio.ps1` directly).
Step 3: Verify locally and on GitHub Pages after the push completes.

One-click option: VS Code Source Control -> Sync Changes (it commits and pushes).

## Deploy (GitHub Pages)
- Push to the `main` branch.
- If Pages is already configured, GitHub will publish the site automatically.
- If not configured, enable Pages in repo settings and select `main` / root; use your published URL: `<YOUR_GITHUB_PAGES_URL>`

## Changelog (recent updates)
- Renamed Photo Gallery to Portfolio
- Updated portfolio category titles and display order
- Added blurred background images for About and Services
- Adjusted Services layout/content
