import nodemailer from 'nodemailer';

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

export async function sendVerificationOTPEmail(to: string, otp: string): Promise<void> {
  await transporter().sendMail({
    from: `"DishDekho" <${process.env.SMTP_FROM}>`,
    to,
    subject: `${otp} is your DishDekho verification code`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Enter this code to finish setting up your DishDekho account:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6b3cff;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}
