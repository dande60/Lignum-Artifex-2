(() => {
  const navbar = document.querySelector(".navbar");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  if (!navbar || !toggle || !nav) return;

  function setOpenState(isOpen) {
    navbar.classList.toggle("menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setOpenState(!isOpen);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 720) {
        setOpenState(false);
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) {
      setOpenState(false);
    }
  });
})();
