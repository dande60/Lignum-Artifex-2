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
    "A curated selection of bespoke cabinetry, built-ins, and interior pieces shaped by clean lines and refined finishes.",
  coach:
    "Custom coach and recreational vehicle woodwork, from built-ins and upgrades to practical details designed for life on the road.",
  hobby:
    "Home and personal projects that show material exploration, one-off ideas, and crafted pieces built with the same studio care.",
  job:
    "Work in motion, from layout and milling through assembly and finishing, offering a closer look at process and progress.",
  milling:
    "Custom milling and material preparation with true stock, clean profiles, and surfaces ready for joinery and final build."
};

function setCategorySearchEngineTags(categoryKey) {
  const readableTitle = CATEGORY_TITLES[categoryKey] || "Portfolio";
  const descriptionText =
    CATEGORY_DESCRIPTIONS[categoryKey] ||
    "Explore portfolio work by Lignum Artifex, featuring bespoke woodwork and custom craftsmanship.";
  const categoryUrl = categoryKey
    ? `https://lignumartifex.com/gallery-category.html?cat=${encodeURIComponent(categoryKey)}`
    : "https://lignumartifex.com/gallery-category.html";

  // Browser tab title
  document.title = `${readableTitle} | Portfolio | Lignum Artifex`;

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
    openGraphTitle.setAttribute("content", `${readableTitle} | Portfolio | Lignum Artifex`);
  }

  const openGraphDescription = document.querySelector(
    'meta[property="og:description"]'
  );
  if (openGraphDescription) {
    openGraphDescription.setAttribute("content", descriptionText);
  }

  const openGraphUrl = document.querySelector('meta[property="og:url"]');
  if (openGraphUrl) {
    openGraphUrl.setAttribute("content", categoryUrl);
  }

  const openGraphImage = document.querySelector('meta[property="og:image"]');
  if (openGraphImage) {
    openGraphImage.setAttribute(
      "content",
      "https://lignumartifex.com/assets/images/social-share.jpg"
    );
  }

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) {
    twitterTitle.setAttribute("content", `${readableTitle} | Portfolio | Lignum Artifex`);
  }

  const twitterDescription = document.querySelector(
    'meta[name="twitter:description"]'
  );
  if (twitterDescription) {
    twitterDescription.setAttribute("content", descriptionText);
  }

  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage) {
    twitterImage.setAttribute(
      "content",
      "https://lignumartifex.com/assets/images/social-share.jpg"
    );
  }

  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    canonicalLink.setAttribute("href", categoryUrl);
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
const descriptionElement = document.getElementById("category-description");

// Safety checks (prevents silent failures)
if (!container || !titleElement) {
  console.error("Required elements not found: #category-photos or #category-title");
} else if (!categoryId) {
  // No category in the address bar
  titleElement.textContent = "Portfolio";
  if (descriptionElement) {
    descriptionElement.textContent =
      "A curated selection of work from across the studio.";
  }
  setCategorySearchEngineTags("portfolio");
  showEmptyState(container);
} else {
  // Update search engine tags immediately
  setCategorySearchEngineTags(categoryId);

  // Update the visible page heading using readable name
  titleElement.textContent = CATEGORY_TITLES[categoryId] || categoryId;
  if (descriptionElement) {
    descriptionElement.textContent =
      CATEGORY_DESCRIPTIONS[categoryId] ||
      "A curated selection of work from this category.";
  }

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
        img.loading = "lazy";
        img.decoding = "async";

        link.appendChild(img);
        container.appendChild(link);
      });
    })
    .catch((err) => console.error("Category load failed:", err));
}
