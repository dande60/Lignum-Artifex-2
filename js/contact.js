(() => {
  const emailUser = 'lignum.artifex.woodworks';
  const emailDomain = 'gmail.com';
  const emailLink = document.getElementById('email-link');

  if (!emailLink) return;

  const email = `${emailUser}@${emailDomain}`;
  let revealed = false;

  emailLink.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!revealed) {
      // First click: reveal email
      emailLink.textContent = email;
      revealed = true;
    } else {
      // Second click: copy to clipboard
      try {
        await navigator.clipboard.writeText(email);
        showCopiedNotice();
      } catch (err) {
        alert(`Email copied: ${email}`); // fallback
      }
    }
  });

  function showCopiedNotice() {
    let notice = document.getElementById('email-copy-notice');

    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'email-copy-notice';
      notice.textContent = 'Email copied to clipboard';
      notice.style.position = 'fixed';
      notice.style.bottom = '20px';
      notice.style.left = '50%';
      notice.style.transform = 'translateX(-50%)';
      notice.style.padding = '10px 14px';
      notice.style.background = 'rgba(25, 37, 55, 0.9)';
      notice.style.color = '#fff';
      notice.style.borderRadius = '10px';
      notice.style.fontSize = '14px';
      notice.style.zIndex = '9999';
      notice.style.opacity = '0';
      notice.style.transition = 'opacity 0.25s ease';
      document.body.appendChild(notice);
    }

    notice.style.opacity = '1';
    clearTimeout(window.__emailNoticeTimer);
    window.__emailNoticeTimer = setTimeout(() => {
      notice.style.opacity = '0';
    }, 1600);
  }
})();
