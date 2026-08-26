import React, { useState } from 'react';
import { supabase } from '../supabase';
import Sidebar from '../components/Sidebar';

export default function CreateProject({ onProjectCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Fetch current logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('You must be logged in to create a project.');
      }

      // Insert new project
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([
          {
            name: title,
            description,
            status,
            owner_id: user.id,
          },
        ])
        .select();

      if (insertError) {
        throw insertError;
      }

      setSuccess('Project created successfully!');
      setTitle('');
      setDescription('');
      setStatus('active');

      if (onProjectCreated && typeof onProjectCreated === 'function') {
        onProjectCreated(data[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 antialiased text-left w-full">
      {/* Dark Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0 leading-tight">
              Create Project
            </h1>
            <p className="text-xs text-slate-500 font-medium">Add a new project to your workspace</p>
          </div>
        </header>

        {/* Form Body */}
        <main className="p-8 flex-1 flex justify-center items-start">
          <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 m-0 border-b border-slate-100 pb-4">
              Project Details
            </h2>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl text-sm font-semibold text-red-700 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            {success && (
              <div className="mb-6 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-sm font-semibold text-emerald-700 flex items-center gap-2">
                <span>✓</span> {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="e.g. Website Redesign"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Write a brief overview of the project..."
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-slate-900 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
      </div>
    </div>
  );
}