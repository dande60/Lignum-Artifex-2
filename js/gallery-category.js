const params = new URLSearchParams(window.location.search);
const categoryId = params.get("cat");

const CATEGORY_TITLES = {
  cabinetry: "Cabinetry",
  coach: "Coach Work",
  hobby: "Home and Hobby",
  job: "In the Making",
  milling: "Custom Milling"
};

const CATEGORY_DESCRIPTIONS = {
  cabinetry:
    "Explore bespoke cabinetry projects by Lignum Artifex, crafted with precision, clean detail, and refined finishes.",
  coach:
    "Coach and recreational vehicle woodwork projects including custom built-ins, upgrades, and crafted solutions for life on the road.",
  hobby:
    "Personal and home projects including custom pieces, shop builds, and one-off ideas brought to life in wood.",
  job:
    "Behind-the-scenes progress showing work in motion, from layout and milling to assembly and finishing.",
  milling:
    "Custom milling and material preparation with flat, true stock and clean profiles ready for joinery and build."
};

function setCategorySearchEngineTags(categoryKey) {
  const readableTitle = CATEGORY_TITLES[categoryKey] || "Portfolio";
  const descriptionText =
    CATEGORY_DESCRIPTIONS[categoryKey] ||
    "Explore portfolio work by Lignum Artifex, featuring bespoke woodwork and custom craftsmanship.";

  // Browser tab title
  document.title = `${readableTitle} | Lignum Artifex`;

  // Meta description (create if missing)
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement("meta");
    metaDescription.setAttribute("name", "description");
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute("content", descriptionText);

  // Open Graph title/description (if present in the page)
  const openGraphTitle = document.querySelector('meta[property="og:title"]');
  if (openGraphTitle) {
    openGraphTitle.setAttribute("content", `${readableTitle} | Lignum Artifex`);
  }

  const openGraphDescription = document.querySelector(
    'meta[property="og:description"]'
  );
  if (openGraphDescription) {
    openGraphDescription.setAttribute("content", descriptionText);
  }
}

function showEmptyState(containerElement) {
  containerElement.innerHTML = "";
  const msg = document.createElement("p");
  msg.textContent = "No photos found in this category yet.";
  msg.style.opacity = "0.8";
  containerElement.appendChild(msg);
}

const container = document.getElementById("category-photos");
const titleElement = document.getElementById("category-title");

// Safety checks (prevents silent failures)
if (!container || !titleElement) {
  console.error("Required elements not found: #category-photos or #category-title");
} else if (!categoryId) {
  // No category in the address bar
  titleElement.textContent = "Portfolio";
  setCategorySearchEngineTags("portfolio");
  showEmptyState(container);
} else {
  // Update search engine tags immediately
  setCategorySearchEngineTags(categoryId);

  // Update the visible page heading using readable name
  titleElement.textContent = CATEGORY_TITLES[categoryId] || categoryId;

  // Load photos for that category
  fetch("assets/data/gallery.json")
    .then((response) => response.json())
    .then((data) => {
      const photos = (data.photos || []).filter(
        (p) => p.category === categoryId
      );
      photos.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

      if (photos.length === 0) {
        showEmptyState(container);
        return;
      }

      container.innerHTML = "";

      photos.forEach((photo) => {
        const link = document.createElement("a");
        link.href = photo.src;
        link.setAttribute("data-lightbox", "portfolio");

        const img = document.createElement("img");
        img.src = photo.src;
        img.alt = photo.filename || "Portfolio photo";

        link.appendChild(img);
        container.appendChild(link);
      });
    })
    .catch((err) => console.error("Category load failed:", err));
}
