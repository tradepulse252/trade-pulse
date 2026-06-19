import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function logError(
  source: string,
  message: string,
  metadata?: Record<string, unknown>,
  stack?: string
): Promise<void> {
  console.error(`[${source}] ${message}`, metadata ?? '');
  try {
    await prisma.errorLog.create({
      data: {
        source,
        level: 'error',
        message,
        stack,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Avoid recursive logging failures
  }
}

export async function logWarn(
  source: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  console.warn(`[${source}] ${message}`, metadata ?? '');
}
