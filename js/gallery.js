const grid = document.getElementById("gallery-categories");

const CATEGORY_TITLES = {
  cabinetry: "Cabinetry",
  coach: "Coach Work",
  "cottage-life": "Cottage Life",
  hobby: "Home and Hobby",
  job: "In the Making",
  milling: "Custom Milling"
};

const CATEGORY_ORDER = [
  "cabinetry",
  "coach",
  "hobby",
  "job",
  "milling",
  "cottage-life"
];

function buildVersionedAssetUrl(src, version) {
  if (!version) {
    return src;
  }

  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${encodeURIComponent(version)}`;
}

fetch(`assets/data/gallery.json?ts=${Date.now()}`, { cache: "no-store" })
  .then((response) => response.json())
  .then((data) => {
    const galleryVersion = data.version;
    const sortedCategories = [...data.categories].sort((a, b) => {
      const orderA = CATEGORY_ORDER.indexOf(a);
      const orderB = CATEGORY_ORDER.indexOf(b);
      const rankA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
      const rankB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return a.localeCompare(b);
    });

    sortedCategories.forEach((category) => {
      const photos = data.photos.filter(
        (p) => p.category === category
      );

      if (photos.length === 0) return;

      const tile = document.createElement("a");
      tile.href = `gallery-category.html?cat=${encodeURIComponent(category)}`;
      tile.className = "category-gallery-tile";

      const img = document.createElement("img");
      const cover =
        photos.find((p) => p.order === 1) ||
        photos.find((p) => (p.filename || "").toLowerCase() === "cover.jpg") ||
        photos[0];
      img.src = buildVersionedAssetUrl(cover.src, galleryVersion);
      img.alt = `${CATEGORY_TITLES[category] || category} portfolio cover`;
      img.loading = "lazy";
      img.decoding = "async";

      const label = document.createElement("span");
      label.textContent = CATEGORY_TITLES[category] || category;


      tile.appendChild(img);
      tile.appendChild(label);
      grid.appendChild(tile);
    });
  })
  .catch((err) => console.error("Gallery load failed:", err));
