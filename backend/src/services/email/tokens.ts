import { randomBytes, randomInt } from 'crypto';

export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateSixDigitCode(): string {
  return String(randomInt(100000, 999999));
}

export function verificationExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export function resetExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}
