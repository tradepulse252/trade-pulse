'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { KeyRound, Activity } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [useCode, setUseCode] = useState(!tokenFromUrl);

  useEffect(() => {
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [emailFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = useCode
        ? { email, code, password }
        : { token: tokenFromUrl!, password };

      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Reset failed');
      setSuccess(data.message);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 mb-2">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Reset password</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          {tokenFromUrl && !useCode
            ? 'Choose a new password for your account.'
            : 'Enter the 6-digit code from your email and a new password.'}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(useCode || !tokenFromUrl) && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reset code</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">New password (min 8 chars)</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          {tokenFromUrl && (
            <button
              type="button"
              onClick={() => setUseCode((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {useCode ? 'Use reset link instead' : 'Use code from email instead'}
            </button>
          )}
          {error && <p className="text-sm text-short">{error}</p>}
          {success && <p className="text-sm text-long">{success}</p>}
          <Button type="submit" className="w-full" disabled={loading || !!success}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Suspense fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-5 w-5 animate-spin" /> Loading…
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
