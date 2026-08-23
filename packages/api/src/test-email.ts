import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testEmail() {
  const { isEmailConfigured, sendVerificationOTPEmail } = await import('./services/email.service.js');

  if (!isEmailConfigured()) {
    console.error('Email is not configured (BREVO_API_KEY/SMTP_FROM missing).');
    return;
  }

  try {
    await sendVerificationOTPEmail(process.env.SMTP_FROM!, '123456');
    console.log('Email sent successfully via Brevo API.');
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

testEmail();
