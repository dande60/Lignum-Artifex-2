(() => {
  const titleEl = document.getElementById("category-title");
  const grid = document.getElementById("category-photos");
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get("cat");
  if (!categoryId) return;

  fetch("assets/data/gallery.json")
    .then((response) => response.json())
    .then((data) => {
      const categories = Array.isArray(data.categories) ? data.categories : [];
      const photos = Array.isArray(data.photos) ? data.photos : [];

      const category = categories.find((item) => item.id === categoryId);
      if (category && titleEl) {
        titleEl.textContent = category.title;
      }

      const filtered = photos.filter((photo) => photo.category === categoryId);
      grid.innerHTML = "";

      filtered.forEach((photo) => {
        const card = document.createElement("div");
        card.className = "album-card";

        const link = document.createElement("a");
        link.href = photo.src;
        link.setAttribute("data-lightbox", categoryId);
        link.setAttribute("data-title", photo.title || photo.alt || "");

        const image = document.createElement("img");
        image.src = photo.src;
        image.alt = photo.alt || photo.title || "Gallery photo";

        link.appendChild(image);
        card.appendChild(link);
        grid.appendChild(card);
      });
    })
    .catch(() => {
      grid.innerHTML = "";
    });
})();
