(() => {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <button class="lightbox-close" type="button">Close</button>
    <div class="lightbox-content">
      <img alt="" />
      <div class="lightbox-caption"></div>
    </div>
  `;

  const imageEl = overlay.querySelector('img');
  const captionEl = overlay.querySelector('.lightbox-caption');
  const closeBtn = overlay.querySelector('.lightbox-close');

  const closeLightbox = () => {
    overlay.classList.remove('active');
    imageEl.src = '';
    imageEl.alt = '';
    captionEl.textContent = '';
  };

  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLightbox();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(overlay);

    document.querySelectorAll('[data-lightbox]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const href = link.getAttribute('href');
        const title = link.getAttribute('data-title') || '';

        imageEl.src = href;
        imageEl.alt = title;
        captionEl.textContent = title;
        overlay.classList.add('active');
      });
    });
  });
})();

