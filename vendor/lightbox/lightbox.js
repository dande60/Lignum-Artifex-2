(() => {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <button class="lightbox-close" type="button">Close</button>
    <button class="lightbox-prev" type="button" aria-label="Previous image">Prev</button>
    <button class="lightbox-next" type="button" aria-label="Next image">Next</button>
    <div class="lightbox-content">
      <img alt="" />
      <div class="lightbox-caption"></div>
    </div>
  `;

  const imageEl = overlay.querySelector('img');
  const captionEl = overlay.querySelector('.lightbox-caption');
  const closeBtn = overlay.querySelector('.lightbox-close');
  const prevBtn = overlay.querySelector('.lightbox-prev');
  const nextBtn = overlay.querySelector('.lightbox-next');

  let currentGroup = [];
  let currentIndex = 0;

  const setNavState = () => {
    const hasNav = currentGroup.length > 1;
    prevBtn.disabled = !hasNav;
    nextBtn.disabled = !hasNav;
    prevBtn.style.display = hasNav ? 'block' : 'none';
    nextBtn.style.display = hasNav ? 'block' : 'none';
  };

  const setImage = (index) => {
    if (!currentGroup.length) return;
    currentIndex = (index + currentGroup.length) % currentGroup.length;
    const link = currentGroup[currentIndex];
    const href = link.getAttribute('href') || '';
    const title = link.getAttribute('data-title') || link.getAttribute('title') || '';

    imageEl.src = href;
    imageEl.alt = title;
    captionEl.textContent = title;
    setNavState();
  };

  const openLightbox = (group, index) => {
    currentGroup = group;
    setImage(index);
    overlay.classList.add('active');
  };

  const closeLightbox = () => {
    overlay.classList.remove('active');
    imageEl.src = '';
    imageEl.alt = '';
    captionEl.textContent = '';
    currentGroup = [];
    currentIndex = 0;
  };

  const getGroupLinks = (groupName) => {
    if (!groupName) return [];
    return Array.from(document.querySelectorAll(`a[data-lightbox="${groupName}"]`));
  };

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => setImage(currentIndex - 1));
  nextBtn.addEventListener('click', () => setImage(currentIndex + 1));

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!overlay.classList.contains('active')) return;
    if (event.key === 'Escape') {
      closeLightbox();
    }
    if (event.key === 'ArrowLeft') {
      setImage(currentIndex - 1);
    }
    if (event.key === 'ArrowRight') {
      setImage(currentIndex + 1);
    }
  });

  document.addEventListener('click', (event) => {
    const link = event.target && event.target.closest
      ? event.target.closest('a[data-lightbox]')
      : null;
    if (!link) return;
    event.preventDefault();

    const groupName = link.getAttribute('data-lightbox') || '';
    const groupLinks = getGroupLinks(groupName);
    const index = Math.max(0, groupLinks.indexOf(link));
    openLightbox(groupLinks.length ? groupLinks : [link], index);
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(overlay);
  });
})();
