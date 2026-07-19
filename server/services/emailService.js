// Thin wrapper around Resend's HTTP API. No SDK — one endpoint, native fetch.

const RESEND_URL = 'https://api.resend.com/emails';

// onboarding@resend.dev works without domain verification but only delivers
// to the Resend account owner's address; set EMAIL_FROM once a domain is verified.
const DEFAULT_FROM = 'Digvy <onboarding@resend.dev>';

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }

  return res.json();
}
