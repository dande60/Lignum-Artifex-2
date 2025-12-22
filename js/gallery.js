(() => {
  const grid = document.getElementById("gallery-categories");
  if (!grid) return;
  const normalizePath = (value) =>
    typeof value === "string" ? value.replace(/^\/+/, "") : value;

  fetch("assets/data/gallery.json")
    .then((response) => response.json())
    .then((data) => {
      const categories = Array.isArray(data.categories) ? data.categories : [];
      grid.innerHTML = "";

      categories.forEach((category) => {
        const card = document.createElement("div");
        card.className = "album-card";

        const link = document.createElement("a");
        link.href = `gallery-category.html?cat=${encodeURIComponent(category.id)}`;

        const image = document.createElement("img");
        image.src = normalizePath(category.cover);
        image.alt = category.title;

        const title = document.createElement("h3");
        title.textContent = category.title;

        link.appendChild(image);
        card.appendChild(link);
        card.appendChild(title);
        grid.appendChild(card);
      });
    })
    .catch(() => {
      grid.innerHTML = "";
    });
})();
