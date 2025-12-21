(() => {
  const emailUser = 'lignum.artifex.woodworks';
  const emailDomain = 'gmail.com';
  const emailLink = document.getElementById('email-link');

  if (emailLink) {
    const email = `${emailUser}@${emailDomain}`;
    emailLink.textContent = email;
    emailLink.setAttribute('href', `mailto:${email}`);
  }

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');

  if (form && status) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      status.textContent = 'Your details were sent successfully!';
      form.reset();
    });
  }
})();

