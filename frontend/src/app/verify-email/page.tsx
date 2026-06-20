'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Activity, MailCheck } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verify = async (payload: { token?: string; code?: string; email?: string }) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Verification failed');
      localStorage.setItem('tp_token', data.token);
      setSuccess('Email verified! Redirecting to dashboard…');
      setTimeout(() => router.push('/'), 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      void verify({ token: tokenFromUrl });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void verify({ email, code });
  };

  const handleResend = async () => {
    if (!email) {
      setError('Enter your email to resend the activation code.');
      return;
    }
    setResending(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to resend');
      setSuccess('A new activation email has been sent.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 mb-2">
          <MailCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Activate your account</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Enter the 6-digit code from your email, or use the activation link we sent you.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Activation code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              required={!tokenFromUrl}
            />
          </div>
          {error && <p className="text-sm text-short">{error}</p>}
          {success && <p className="text-sm text-long">{success}</p>}
          <Button type="submit" className="w-full" disabled={loading || !!tokenFromUrl}>
            {loading ? 'Verifying…' : 'Activate account'}
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-2 text-center text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-primary hover:underline disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend activation email'}
          </button>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Suspense fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-5 w-5 animate-spin" /> Loading…
          </div>
        }>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}
