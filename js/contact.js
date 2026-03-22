(() => {
  const emailLink = document.getElementById("email-link");

  if (!emailLink) return;

  const email = "info@lignumartifex.com";
  const subject = encodeURIComponent("Project Inquiry");
  emailLink.href = `mailto:${email}?subject=${subject}`;
})();
