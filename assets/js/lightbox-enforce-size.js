(function () {
  function applySizing() {
    const lb = document.getElementById('lightbox');
    if (!lb) return;

    const img = lb.querySelector('.lb-image');
    const outer = lb.querySelector('.lb-outerContainer');
    const data = lb.querySelector('.lb-dataContainer');

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    const maxW = isMobile ? '92vw' : '60vw';
    const maxH = isMobile ? '85vh' : '70vh';

    if (outer) {
      outer.style.setProperty('max-width', maxW, 'important');
      outer.style.setProperty('width', 'auto', 'important');
      outer.style.setProperty('height', 'auto', 'important');
      outer.style.setProperty('margin', '0 auto', 'important');
    }

    if (img) {
      img.style.setProperty('max-width', maxW, 'important');
      img.style.setProperty('max-height', maxH, 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', 'auto', 'important');
    }

    if (data) {
      data.style.setProperty('max-width', maxW, 'important');
    }
  }

  // Apply after clicks (Lightbox opens after click)
  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest ? e.target.closest('a[data-lightbox]') : null;
    if (!a) return;
    setTimeout(applySizing, 60);
    setTimeout(applySizing, 200);
  });

  // Re-apply on resize/orientation changes
  window.addEventListener('resize', function () {
    setTimeout(applySizing, 60);
  });

  // Also observe DOM in case Lightbox is opened programmatically
  const obs = new MutationObserver(function () {
    applySizing();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
