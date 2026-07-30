import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// packages/api/assets — resolves the same from src/services (tsx) and dist/services (built).
const LOGO_PATH = path.resolve(__dirname, '../../assets/dishdekho-email-logo.png');
const LOGO_CID = 'dishdekho-logo';

/** Inline the logo via CID so it renders without the client fetching a remote image. */
function logoAttachment() {
  if (!fs.existsSync(LOGO_PATH)) return [];
  return [{ filename: 'dishdekho.png', path: LOGO_PATH, cid: LOGO_CID }];
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM
  );
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface InquiryNotification {
  type: 'contact' | 'newsletter';
  name?: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
}

/**
 * Alerts the team that a new landing-page inquiry landed, so nobody has to poll
 * the admin panel. Sends to INQUIRY_NOTIFY_EMAIL, falling back to SMTP_FROM.
 */
export async function notifyNewInquiry(inquiry: InquiryNotification): Promise<void> {
  const to = process.env.INQUIRY_NOTIFY_EMAIL || process.env.SMTP_FROM;
  if (!to) return;

  const rows: [string, string][] = [
    ['Name', inquiry.name ?? '—'],
    ['Email', inquiry.email],
    ['Phone', inquiry.phone ?? '—'],
    ['Subject', inquiry.subject ?? '—'],
  ];

  const isContact = inquiry.type === 'contact';

  await transporter().sendMail({
    from: `"DishDekho" <${process.env.SMTP_FROM}>`,
    to,
    replyTo: inquiry.email,
    subject: isContact
      ? `New enquiry: ${inquiry.subject ?? 'Contact form'}`
      : `New newsletter subscriber: ${inquiry.email}`,
    attachments: logoAttachment(),
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #03182c;">
        <div style="text-align: center; padding: 8px 0 20px;">
          <img src="cid:${LOGO_CID}" alt="DishDekho" width="150" style="display: block; margin: 0 auto; border: 0;" />
        </div>
        <h2 style="margin-bottom: 4px;">${isContact ? 'New contact enquiry' : 'New newsletter subscriber'}</h2>
        <p style="color: #5B6B7F; margin-top: 0;">Received from the DishDekho website.</p>
        ${
          isContact
            ? `<table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                ${rows
                  .map(
                    ([label, value]) => `
                  <tr>
                    <td style="padding: 8px 12px 8px 0; color: #5B6B7F; width: 90px; vertical-align: top;">${label}</td>
                    <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(value)}</td>
                  </tr>`,
                  )
                  .join('')}
              </table>
              <p style="color: #5B6B7F; margin-bottom: 6px; margin-top: 20px;">Message</p>
              <div style="background: #FFF8F3; border-radius: 12px; padding: 16px; white-space: pre-wrap;">${escapeHtml(
                inquiry.message ?? '',
              )}</div>`
            : `<p style="font-size: 18px; font-weight: 600;">${escapeHtml(inquiry.email)}</p>`
        }
      </div>
    `,
  });
}

export async function sendVerificationOTPEmail(to: string, otp: string): Promise<void> {
  await transporter().sendMail({
    from: `"DishDekho" <${process.env.SMTP_FROM}>`,
    to,
    subject: `${otp} is your DishDekho verification code`,
    attachments: logoAttachment(),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #03182c;">
        <div style="text-align: center; padding: 8px 0 24px;">
          <img src="cid:${LOGO_CID}" alt="DishDekho" width="180" style="display: block; margin: 0 auto; border: 0;" />
        </div>
        <h2>Verify your email</h2>
        <p>Enter this code to finish setting up your DishDekho account:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6b3cff;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}
