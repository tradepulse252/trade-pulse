import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendPasswordResetEmail, sendWelcomeVerificationEmail } from '../services/email/email-service';
import {
  generateSecureToken,
  generateSixDigitCode,
  resetExpiry,
  verificationExpiry,
} from '../services/email/tokens';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const verifyEmailSchema = z.object({
  email: z.string().email().optional(),
  code: z.string().length(6).optional(),
  token: z.string().min(16).optional(),
}).refine((d) => d.code || d.token, { message: 'Provide code or token' });

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8),
  code: z.string().length(6).optional(),
  token: z.string().min(16).optional(),
}).refine((d) => d.code || d.token, { message: 'Provide code or token' });

function authUserPayload(user: { id: string; email: string; name: string | null; role: string; emailVerified: boolean }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid registration data', details: parsed.error.flatten() });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing?.emailVerified) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const verifyToken = generateSecureToken();
  const verifyCode = generateSixDigitCode();
  const verifyExpiresAt = verificationExpiry();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          name: parsed.data.name ?? existing.name,
          verifyToken,
          verifyCode,
          verifyExpiresAt,
          emailVerified: false,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: parsed.data.name,
          emailVerified: false,
          verifyToken,
          verifyCode,
          verifyExpiresAt,
          alertSettings: { create: {} },
        },
      });

  try {
    await sendWelcomeVerificationEmail({
      to: user.email,
      name: user.name,
      code: verifyCode,
      token: verifyToken,
    });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
    return;
  }

  res.status(201).json({
    message: 'Account created. Check your email for the activation code and link.',
    requiresVerification: true,
    email: user.email,
  });
});

router.post('/verify-email', async (req: Request, res: Response) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid verification data', details: parsed.error.flatten() });
    return;
  }

  const { code, token, email } = parsed.data;
  const user = token
    ? await prisma.user.findUnique({ where: { verifyToken: token } })
    : await prisma.user.findFirst({
        where: {
          email: email?.toLowerCase(),
          verifyCode: code,
        },
      });

  if (!user) {
    res.status(400).json({ error: 'Invalid or expired activation code' });
    return;
  }

  if (user.verifyExpiresAt && user.verifyExpiresAt < new Date()) {
    res.status(400).json({ error: 'Activation code expired. Request a new one.' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verifyToken: null,
      verifyCode: null,
      verifyExpiresAt: null,
    },
  });

  const jwtToken = jwt.sign({ userId: updated.id, role: updated.role }, env.JWT_SECRET, { expiresIn: '7d' });
  res.json({
    message: 'Email verified successfully. Welcome to Trade-Pulse!',
    token: jwtToken,
    user: authUserPayload(updated),
  });
});

router.post('/resend-verification', async (req: Request, res: Response) => {
  const parsed = resendVerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || user.emailVerified) {
    res.json({ message: 'If an unverified account exists, a new activation email has been sent.' });
    return;
  }

  const verifyToken = generateSecureToken();
  const verifyCode = generateSixDigitCode();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verifyToken,
      verifyCode,
      verifyExpiresAt: verificationExpiry(),
    },
  });

  try {
    await sendWelcomeVerificationEmail({
      to: user.email,
      name: user.name,
      code: verifyCode,
      token: verifyToken,
    });
  } catch {
    res.status(502).json({ error: 'Failed to send email. Try again later.' });
    return;
  }

  res.json({ message: 'If an unverified account exists, a new activation email has been sent.' });
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!user.emailVerified) {
    res.status(403).json({
      error: 'Email not verified. Check your inbox for the activation code.',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    });
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: authUserPayload(user) });
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.emailVerified) {
    const resetToken = generateSecureToken();
    const resetCode = generateSixDigitCode();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetCode,
        resetExpiresAt: resetExpiry(),
      },
    });

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        code: resetCode,
        token: resetToken,
      });
    } catch {
      res.status(502).json({ error: 'Failed to send reset email. Try again later.' });
      return;
    }
  }

  res.json({
    message: 'If an account exists for that email, a password reset link and code have been sent.',
  });
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid reset data', details: parsed.error.flatten() });
    return;
  }

  const { code, token, email, password } = parsed.data;
  const user = token
    ? await prisma.user.findUnique({ where: { resetToken: token } })
    : await prisma.user.findFirst({
        where: {
          email: email?.toLowerCase(),
          resetCode: code,
        },
      });

  if (!user) {
    res.status(400).json({ error: 'Invalid or expired reset code' });
    return;
  }

  if (user.resetExpiresAt && user.resetExpiresAt < new Date()) {
    res.status(400).json({ error: 'Reset code expired. Request a new password reset.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetCode: null,
      resetExpiresAt: null,
    },
  });

  res.json({ message: 'Password updated successfully. You can now sign in.' });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

export default router;
