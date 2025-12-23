
const params = new URLSearchParams(window.location.search);
const categoryId = params.get("cat");

const container = document.getElementById("category-photos");
const title = document.getElementById("category-title");

fetch("assets/data/gallery.json")
  .then((response) => response.json())
  .then((data) => {
    title.textContent = categoryId;

    const photos = data.photos.filter(
      (p) => p.category === categoryId
    );

    photos.forEach((photo) => {
      const link = document.createElement("a");
      link.href = photo.src;
      link.setAttribute("data-lightbox", "portfolio");

      const img = document.createElement("img");
      img.src = photo.src;
      img.alt = photo.filename;

      link.appendChild(img);
      container.appendChild(link);
    });
  })
  .catch((err) => console.error("Category load failed:", err));
