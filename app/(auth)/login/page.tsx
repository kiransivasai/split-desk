'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin) {
        // Register
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Registration failed');
          setLoading(false);
          return;
        }
      }

      // Sign in
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-c0 flex">
      {/* Left hero panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-blue/5"></div>
        <div className="relative z-10 max-w-md">
          <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center mb-8">
            <span className="text-accent font-bold text-2xl">S</span>
          </div>
          <h1 className="text-4xl font-bold text-t1 mb-4 leading-tight">
            Split expenses <br/>
            <span className="glow-text">without the mess</span>
          </h1>
          <p className="text-t2 text-lg leading-relaxed mb-8">
            Track, split, and settle team expenses effortlessly. 
            Real-time balances, smart settlements, and beautiful analytics.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: '12K+', l: 'Expenses tracked' },
              { n: '$2.4M', l: 'Amounts settled' },
              { n: '340+', l: 'Active teams' },
            ].map((s) => (
              <div key={s.l} className="card-inner text-center py-3">
                <p className="text-xl font-bold text-accent">{s.n}</p>
                <p className="text-[11px] text-t3 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-accent font-bold text-xl">S</span>
            </div>
            <h1 className="text-2xl font-bold glow-text">SplitDesk</h1>
          </div>

          <div className="card card-p">
            <h2 className="text-xl font-bold text-t1 mb-1">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-t2 mb-6">
              {isLogin ? 'Sign in to your SplitDesk account' : 'Get started with SplitDesk'}
            </p>

            {error && (
              <div className="alert alert-warn mb-4">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center py-3 text-sm disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-sm text-t3">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
              </span>
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm text-accent font-semibold hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
