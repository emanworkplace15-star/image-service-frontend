'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, errMessage, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ accessToken: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
        false,
      );
      setToken(res.accessToken);
      router.push('/upload');
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Admin login</h1>
      <form className="stack" onSubmit={onSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@local"
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}
