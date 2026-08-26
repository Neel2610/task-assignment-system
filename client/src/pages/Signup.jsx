import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';

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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess('Signup successful! Redirecting to login...');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 px-4 py-12 text-left">
      {/* App Branding Heading */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          <span className="text-blue-500">⚡</span> TaskFlow
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Create an account to get started
        </p>
      </div>

      {/* Centered White Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Create an account
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Fill in your details below to register
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-3">
            <span className="text-red-600 font-bold text-base leading-none">!</span>
            <div className="text-sm font-medium text-red-800 leading-tight">
              {error}
            </div>
          </div>
        )}

        {/* Success Alert Box */}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-3">
            <span className="text-emerald-600 font-bold text-base leading-none">✓</span>
            <div className="text-sm font-medium text-emerald-800 leading-tight">
              {success}
            </div>
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSignup}>
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-semibold text-slate-900 mb-1.5"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-slate-900 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-900 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-slate-900 mb-1.5"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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

        {/* Footer Link */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}