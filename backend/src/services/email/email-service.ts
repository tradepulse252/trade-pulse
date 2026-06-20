import { Resend } from 'resend';
import { env } from '../../config/env';
import { logError } from '../../utils/logger';
import { passwordResetEmail, welcomeVerificationEmail } from './templates';

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const client = getClient();

  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set — would send to ${to}: ${subject}`);
    console.warn(`[email] Set RESEND_API_KEY in backend/.env to deliver emails via Resend.`);
    return;
  }

  const { error } = await client.emails.send({
    from: env.EMAIL_FROM,
    to,
    replyTo: env.EMAIL_REPLY_TO,
    subject,
    html,
  });

  if (error) {
    await logError('email', `Failed to send: ${subject}`, { to }, error.message);
    throw new Error('Failed to send email. Please try again later.');
  }
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
