(() => {
  const emailUser = "lignum.artifex.woodworks";
  const emailDomain = "gmail.com";
  const emailLink = document.getElementById("email-link");

  if (!emailLink) return;

  const email = `${emailUser}@${emailDomain}`;
  const subject = encodeURIComponent("Project Inquiry");
  emailLink.href = `mailto:${email}?subject=${subject}`;
})();
