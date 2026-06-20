'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { KeyRound } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setSuccess(data.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 mb-2">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Forgot password</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your email and we&apos;ll send a reset code and link.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-short">{error}</p>}
              {success && <p className="text-sm text-long">{success}</p>}
              <Button type="submit" className="w-full" disabled={loading || !!success}>
                {loading ? 'Sending…' : 'Send reset email'}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
