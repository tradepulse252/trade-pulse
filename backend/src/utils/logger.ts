import { db } from '../lib/db';

export async function logError(
  source: string,
  message: string,
  metadata?: Record<string, unknown>,
  stack?: string
): Promise<void> {
  console.error(`[${source}] ${message}`, metadata ?? '');
  try {
    await db.errorLogs.create({
      source,
      level: 'error',
      message,
      stack,
      metadata,
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
