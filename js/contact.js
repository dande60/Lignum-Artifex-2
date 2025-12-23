(() => {
  const emailUser = 'lignum.artifex.woodworks';
  const emailDomain = 'gmail.com';
  const emailLink = document.getElementById('email-link');

  if (!emailLink) return;

  const email = `${emailUser}@${emailDomain}`;
  let revealed = false;

  emailLink.addEventListener('click', (e) => {
    if (!revealed) {
      e.preventDefault();
      emailLink.textContent = email;
      emailLink.setAttribute('href', `mailto:${email}`);
      revealed = true;
    }
  });
})();
