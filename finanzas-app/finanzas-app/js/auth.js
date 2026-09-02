// auth.js — login/registration verification codes.
//
// IMPORTANT — read this if you want REAL emails to be sent:
// This app has no backend server, so it cannot send emails by itself.
// By default it runs in "demo mode": the 6-digit code is generated and shown
// directly on screen instead of being emailed, so the login flow is fully
// usable and testable without any extra setup.
//
// To send REAL verification emails, the simplest option is EmailJS
// (https://www.emailjs.com — has a free tier, no backend required):
//   1) Create a free account and an Email Service + Email Template
//      (your template should include a {{code}} and {{to_email}} variable).
//   2) Fill in the three constants below with your Service ID, Template ID
//      and Public Key from the EmailJS dashboard.
//   3) Add this line to index.html's <head>, before js/app.js:
//        <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
//   4) That's it — sendVerificationCode() below will automatically use it
//      instead of the demo mode once the three constants are filled in.

const EMAILJS_SERVICE_ID = '';
const EMAILJS_TEMPLATE_ID = '';
const EMAILJS_PUBLIC_KEY = '';

export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendVerificationCode(name, email, code) {
  const configured = EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY && window.emailjs;
  if (configured) {
    try {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: email, to_name: name, code,
      }, EMAILJS_PUBLIC_KEY);
      return { simulated: false, ok: true };
    } catch (e) {
      return { simulated: false, ok: false };
    }
  }
  // Demo mode — no email service wired up yet.
  return { simulated: true, ok: true };
}
