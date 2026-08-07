import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    const info = await transporter.sendMail({
      from: `"DishDekho" <${process.env.SMTP_FROM}>`,
      to: 'prabhjot8086@gmail.com', // User's email from screenshot
      subject: 'Test Email',
      text: 'This is a test email.',
    });
    console.log('Email sent successfully:', info.messageId);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

testEmail();
