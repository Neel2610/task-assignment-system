import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { useUserRole } from '../hooks/useUserRole';

export default function CreateProject() {
  const navigate = useNavigate();
  const { role, loading: roleLoading, isMember } = useUserRole();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (!roleLoading && isMember) {
      navigate('/dashboard', { state: { error: 'Access denied: Members cannot create projects.' }, replace: true });
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate('/');
        }
      } catch (err) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate, roleLoading, isMember]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Project title cannot be empty');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([
          {
            name: title.trim(),
            description: description.trim(),
            status,
            owner_id: user.id,
          },
        ])
        .select();

      if (insertError) {
        throw insertError;
      }

      const createdProject = data && data[0];

      if (createdProject) {
        const { error: memberError } = await supabase
          .from('project_members')
          .insert([
            {
              project_id: createdProject.id,
              user_id: user.id,
              role_in_project: 'admin',
            },
          ]);

        if (memberError) {
          console.error('Member insert warning:', memberError);
        }
      }

      try {
        await fetch('http://localhost:3001/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'Project Created',
            user: 'current user',
            page: 'Create Project',
            details: `New project created`
          })
        });
      } catch { /* ignore */ }

      setSuccess('Project created successfully! Redirecting to dashboard...');
      setTitle('');
      setDescription('');
      setStatus('active');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight m-0 leading-tight">
            New Project
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Add a new project to your workspace</p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/60 rounded-xl transition-all border border-slate-800/60"
        >
          ← Back to Dashboard
        </Link>
      </header>

      <main className="p-8 flex-1 flex justify-center items-start font-sans">
        <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-slate-800/80 animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-6">
            <h2 className="text-xl font-bold text-white m-0">
              Project Details
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Fields marked <span className="text-rose-500">*</span> are required
            </span>
          </div>

          {error && (
            <div className="mb-6 bg-red-950/25 border border-red-900/50 p-4 rounded-xl text-sm font-semibold text-red-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span>⚠️</span> <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-200 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-emerald-950/25 border border-emerald-900/50 p-4 rounded-xl text-sm font-semibold text-emerald-300 flex items-center gap-2 animate-fade-in-up">
              <span>✓</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-slate-300 mb-2">
                Project Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="e.g. Mobile App Redesign"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-slate-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Write a brief overview of the project and goals..."
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-slate-300 mb-2">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="active" className="bg-slate-950 text-slate-100">Active</option>
                <option value="on_hold" className="bg-slate-950 text-slate-100">On Hold</option>
                <option value="completed" className="bg-slate-950 text-slate-100">Completed</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Project...</span>
                  </div>
                ) : (
                  'Create Project'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
}