import dns from 'dns';
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

/** Render free tier blocks SMTP ports — Gmail only works locally or on paid Render. */
function canUseSmtp(): boolean {
  if (!env.GMAIL_APP_PASSWORD) return false;
  if (!env.EMAIL_USE_SMTP) return false;
  if (process.env.RENDER === 'true') return false;
  return true;
}

function getResendFromEmail(): string {
  if (env.RESEND_FROM_ADDRESS) return env.RESEND_FROM_ADDRESS;
  // Resend rejects @gmail.com senders — fall back to test sender
  if (env.EMAIL_FROM_ADDRESS.includes('@gmail.com')) {
    return 'onboarding@resend.dev';
  }
  return env.EMAIL_FROM_ADDRESS;
}

function buildFromAddress(email: string): string {
  return `${env.EMAIL_FROM_NAME} <${email}>`;
}

function isResendTestSender(fromEmail: string): boolean {
  return fromEmail.endsWith('@resend.dev');
}

async function sendViaResend(to: string, subject: string, html: string): Promise<string | null> {
  const client = getResendClient();
  if (!client) return 'Resend API key not configured';

  const fromEmail = getResendFromEmail();
  const from = buildFromAddress(fromEmail);

  if (isResendTestSender(fromEmail) && to.toLowerCase() !== env.EMAIL_REPLY_TO.toLowerCase()) {
    return (
      'Resend test sender (onboarding@resend.dev) only delivers to your Resend account email. ' +
      'Verify a domain at resend.com/domains and set RESEND_FROM_ADDRESS (e.g. noreply@tradepulse.io).'
    );
  }

  const { error } = await client.emails.send({
    from,
    to,
    replyTo: env.EMAIL_REPLY_TO,
    subject,
    html,
  });

  if (error) return error.message;
  return null;
}

async function sendViaGmail(to: string, subject: string, html: string): Promise<string | null> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    lookup: (hostname: string, _opts: unknown, cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
      dns.lookup(hostname, { family: 4 }, cb);
    },
  } as nodemailer.TransportOptions);

  try {
    await transporter.sendMail({
      from: buildFromAddress(env.EMAIL_FROM_ADDRESS),
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
  const errors: string[] = [];

  // Resend HTTP API works on Render free tier; SMTP ports 465/587 are blocked there.
  if (env.RESEND_API_KEY) {
    const resendErr = await sendViaResend(to, subject, html);
    if (!resendErr) {
      console.log(`[email] Sent via Resend to ${to}: ${subject}`);
      return;
    }
    errors.push(`Resend: ${resendErr}`);
  }

  if (canUseSmtp()) {
    const gmailErr = await sendViaGmail(to, subject, html);
    if (!gmailErr) {
      console.log(`[email] Sent via Gmail SMTP to ${to}: ${subject}`);
      return;
    }
    errors.push(`Gmail: ${gmailErr}`);
  } else if (env.GMAIL_APP_PASSWORD && !env.EMAIL_USE_SMTP) {
    errors.push('Gmail: SMTP disabled (EMAIL_USE_SMTP=false)');
  } else if (env.GMAIL_APP_PASSWORD && process.env.RENDER === 'true') {
    errors.push('Gmail: Render blocks outbound SMTP on free tier — use Resend with a verified domain');
  }

  if (!env.RESEND_API_KEY && !env.GMAIL_APP_PASSWORD) {
    console.warn(`[email] No email provider configured — would send to ${to}: ${subject}`);
    throw new Error('Email service is not configured on the server.');
  }

  const fromEmail = env.RESEND_API_KEY ? getResendFromEmail() : env.EMAIL_FROM_ADDRESS;
  await logError('email', `Failed to send: ${subject}`, { to, from: buildFromAddress(fromEmail), errors }, errors.join(' | '));
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
