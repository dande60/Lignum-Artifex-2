(() => {
  const emailUser = 'lignum.artifex.woodworks';
  const emailDomain = 'gmail.com';
  const emailLink = document.getElementById('email-link');

  if (!emailLink) return;

  const email = `${emailUser}@${emailDomain}`;
  let revealed = false;

  emailLink.addEventListener('click', (e) => {
    e.preventDefault();

    if (!revealed) {
      // First click: reveal email
      emailLink.textContent = email;
      emailLink.setAttribute('href', `mailto:${email}`);
      revealed = true;
    } else {
      // Second click: open mail client explicitly
      window.location.href = `mailto:${email}`;
    }
  });
})();
