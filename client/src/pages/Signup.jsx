import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import ParticleBackground from '../components/ParticleBackground';

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Password cannot be empty.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data?.user) {
        const { error: userInsertError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              full_name: fullName,
              email: email,
              role: 'member',
            },
          ]);

        if (userInsertError) {
          throw userInsertError;
        }
      }

      setSuccess('Signup successful! Redirecting to login...');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'An error occurred during signup.');
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
        <p className="mt-2 text-sm text-slate-400">
          Create an account to get started
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl p-10 border border-slate-800/80 animate-fade-in-up transition-all duration-300 hover:border-blue-500/30">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Create an account
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Fill in your details below to register
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

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 flex items-start space-x-3">
            <span className="text-emerald-400 font-bold text-base leading-none">✓</span>
            <div className="text-sm font-semibold text-emerald-300 leading-tight">
              {success}
            </div>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSignup}>
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-semibold text-slate-300 mb-1.5"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="John Doe"
            />
          </div>

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
              required
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
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-slate-300 mb-1.5"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <span>Creating account...</span>
                </div>
              ) : (
                'Sign Up'
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/60 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}