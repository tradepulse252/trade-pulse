'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Activity, Mail } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register(email, password, name || undefined);
      if (result.requiresVerification) {
        setSent(true);
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
        }, 2500);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto h-12 w-12 rounded-lg bg-long/20 flex items-center justify-center border border-long/30 mb-2">
                <Mail className="h-6 w-6 text-long" />
              </div>
              <CardTitle>Check your email</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                We sent a welcome message with your activation code and link to <strong>{email}</strong>.
              </p>
            </CardHeader>
            <CardContent>
              <Link href={`/verify-email?email=${encodeURIComponent(email)}`}>
                <Button className="w-full">Enter activation code</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 mb-2">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Create your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Password (min 8 chars)</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              </div>
              {error && <p className="text-sm text-short">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
