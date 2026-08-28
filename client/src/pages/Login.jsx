import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import ParticleBackground from '../components/ParticleBackground';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      try {
        await fetch('http://localhost:3001/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'User Login',
            user: email,
            page: 'Login',
            details: 'Successful authentication'
          })
        });
      } catch { /* server may not be running */ }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0B0F17] px-4 py-12 text-left relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-dot-matrix pointer-events-none -z-10 opacity-70" />
      <ParticleBackground />

      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          <span className="text-blue-500 animate-pulse">⚡</span> TaskFlow
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
          Manage your team, projects, and tasks in one place
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl p-10 border border-slate-800/80 animate-fade-in-up transition-all duration-300 hover:border-blue-500/30">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Sign in
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Enter your credentials to access your account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/20 border border-red-900/50 flex items-start space-x-3">
            <span className="text-red-400 font-bold text-base leading-none">!</span>
            <div className="text-sm font-semibold text-red-300 leading-tight">
              {error}
            </div>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-300 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/60 text-center text-sm text-slate-400">
          Contact your administrator to get access
        </div>
      </div>
    </div>
  );
}