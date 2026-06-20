import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logError } from '../../utils/logger';
import { passwordResetEmail, welcomeVerificationEmail } from './templates';

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

function buildFromAddress(): string {
  return `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`;
}

function canUseResendTestSender(): boolean {
  return env.EMAIL_FROM_ADDRESS.endsWith('@resend.dev');
}

async function sendViaResend(to: string, subject: string, html: string): Promise<string | null> {
  const client = getResendClient();
  if (!client) return 'Resend API key not configured';

  if (canUseResendTestSender() && to.toLowerCase() !== env.EMAIL_REPLY_TO.toLowerCase()) {
    return 'Resend test sender can only email the account owner. Configure Gmail SMTP or verify a domain on Resend.';
  }

  const { error } = await client.emails.send({
    from: buildFromAddress(),
    to,
    replyTo: env.EMAIL_REPLY_TO,
    subject,
    html,
  });

  if (error) return error.message;
  return null;
}

async function sendViaGmail(to: string, subject: string, html: string): Promise<string | null> {
  if (!env.GMAIL_APP_PASSWORD) {
    return 'Gmail app password not configured';
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: buildFromAddress(),
      to,
      replyTo: env.EMAIL_REPLY_TO,
      subject,
      html,
    });
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const from = buildFromAddress();
  const errors: string[] = [];

  // Prefer Gmail for production — works with tradepulse252@gmail.com for any recipient
  if (env.GMAIL_APP_PASSWORD) {
    const gmailErr = await sendViaGmail(to, subject, html);
    if (!gmailErr) {
      console.log(`[email] Sent via Gmail SMTP to ${to}: ${subject}`);
      return;
    }
    errors.push(`Gmail: ${gmailErr}`);
  }

  // Resend fallback (requires verified domain unless sending to account owner only)
  if (env.RESEND_API_KEY) {
    const resendErr = await sendViaResend(to, subject, html);
    if (!resendErr) {
      console.log(`[email] Sent via Resend to ${to}: ${subject}`);
      return;
    }
    errors.push(`Resend: ${resendErr}`);
  }

  if (!env.GMAIL_APP_PASSWORD && !env.RESEND_API_KEY) {
    console.warn(`[email] No email provider configured — would send to ${to}: ${subject}`);
    throw new Error('Email service is not configured on the server.');
  }

  await logError('email', `Failed to send: ${subject}`, { to, from, errors }, errors.join(' | '));
  throw new Error(
    'Could not send email. Please try again in a few minutes or contact support at tradepulse252@gmail.com.'
  );
}

export async function sendWelcomeVerificationEmail(params: {
  to: string;
  name?: string | null;
  code: string;
  token: string;
}): Promise<void> {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${params.token}&email=${encodeURIComponent(params.to)}`;
  const { subject, html } = welcomeVerificationEmail({
    name: params.name,
    code: params.code,
    verifyUrl,
  });
  await sendEmail(params.to, subject, html);
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string | null;
  code: string;
  token: string;
}): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${params.token}&email=${encodeURIComponent(params.to)}`;
  const { subject, html } = passwordResetEmail({
    name: params.name,
    code: params.code,
    resetUrl,
  });
  await sendEmail(params.to, subject, html);
}
