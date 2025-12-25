const grid = document.getElementById("gallery-categories");

const CATEGORY_TITLES = {
  cabinetry: "Cabinetry",
  coach: "Coach Work",
  hobby: "Home and Hobby",
  job: "In the Making",
  milling: "Custom Milling"
};

fetch("assets/data/gallery.json")
  .then((response) => response.json())
  .then((data) => {
    data.categories.forEach((category) => {
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
      img.src = cover.src;
      img.alt = category;

      const label = document.createElement("span");
     label.textContent = CATEGORY_TITLES[category] || category;


      tile.appendChild(img);
      tile.appendChild(label);
      grid.appendChild(tile);
    });
  })
  .catch((err) => console.error("Gallery load failed:", err));
