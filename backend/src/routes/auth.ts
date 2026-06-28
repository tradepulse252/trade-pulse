import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../lib/db';
import { env } from '../config/env';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendPasswordResetEmail } from '../services/email/email-service';
import { generateSecureToken, generateSixDigitCode, resetExpiry } from '../services/email/tokens';

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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8),
  code: z.string().length(6).optional(),
  token: z.string().min(16).optional(),
}).refine((d) => d.code || d.token, { message: 'Provide code or token' });

function authUserPayload(user: { id: string; email: string; name: string | null; role: string }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid registration data', details: parsed.error.flatten() });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.users.findByEmail(email);

  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await db.users.create({
    email,
    passwordHash,
    name: parsed.data.name,
  });

  if (!user) {
    res.status(500).json({ error: 'Failed to create account' });
    return;
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    message: 'Account created successfully.',
    token,
    user: authUserPayload(user),
  });
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await db.users.findByEmail(parsed.data.email.toLowerCase());
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  await db.users.update(user.id, { lastLoginAt: new Date() });

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
  const user = await db.users.findByEmail(email);

  if (user) {
    const resetToken = generateSecureToken();
    const resetCode = generateSixDigitCode();

    await db.users.update(user.id, {
      resetToken,
      resetCode,
      resetExpiresAt: resetExpiry(),
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
    ? await db.users.findByResetToken(token)
    : email && code
      ? await db.users.findByEmailAndResetCode(email, code)
      : null;

  if (!user) {
    res.status(400).json({ error: 'Invalid or expired reset code' });
    return;
  }

  if (user.resetExpiresAt && user.resetExpiresAt < new Date()) {
    res.status(400).json({ error: 'Reset code expired. Request a new password reset.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.users.update(user.id, {
    passwordHash,
    resetToken: null,
    resetCode: null,
    resetExpiresAt: null,
  });

  res.json({ message: 'Password updated successfully. You can now sign in.' });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await db.users.findById(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

export default router;
