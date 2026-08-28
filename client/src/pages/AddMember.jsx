import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';

export default function AddMember() {
  const navigate = useNavigate();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [roleInProject, setRoleInProject] = useState('member');

  // Page states
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [projects, setProjects] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const initPage = async () => {
      try {
        setPageLoading(true);
        setError(null);

        // 1. Get logged in user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          navigate('/');
          return;
        }

        // 2. Fetch role of logged in user from users table
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw new Error('Failed to verify user permissions.');
        }

        const userRole = userProfile?.role?.toLowerCase() || 'member';

        if (userRole === 'member') {
          navigate('/dashboard', { state: { error: 'Access denied' } });
          return;
        }

        setCurrentUserRole(userRole);

        // 3. Fetch projects list
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .order('name', { ascending: true });

        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
      } catch (err) {
        setError(err.message || 'Error initializing page.');
      } finally {
        setPageLoading(false);
      }
    };

    initPage();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Validation
    if (!trimmedName) {
      setError('Please enter a full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Role enforcement
    if (currentUserRole !== 'super_admin' && role === 'admin') {
      setError('Only Super Admins can assign the Admin role.');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create auth account using supabase.auth.signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: { full_name: trimmedName },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData?.user?.id) {
        throw new Error('User creation failed. Please check the details and try again.');
      }

      const newUserId = authData.user.id;

      // Step 2: Insert into users table
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          full_name: trimmedName,
          email: trimmedEmail,
          role: role,
        });

      if (userInsertError) {
        throw new Error(`Auth account created, but failed to create user record: ${userInsertError.message}`);
      }

      // Step 3: If a project was selected, insert into project_members
      if (selectedProjectId) {
        const { error: memberInsertError } = await supabase
          .from('project_members')
          .insert({
            project_id: selectedProjectId,
            user_id: newUserId,
            role_in_project: roleInProject,
          });

        if (memberInsertError) {
          throw new Error(`User created, but failed to assign to project: ${memberInsertError.message}`);
        }
      }

      // Step 4: Show success message
      setSuccess(
        `User ${trimmedName} created successfully. They can now log in with their email and password.`
      );

      // Step 5: Clear form after success
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('member');
      setSelectedProjectId('');
      setRoleInProject('member');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while creating the user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
            Create New User & Member
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Admin portal to provision user accounts and assign them to workspace projects.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/50 flex items-start space-x-3">
            <span className="text-red-400 font-bold text-base leading-none">!</span>
            <div className="text-sm font-semibold text-red-300 leading-tight">
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-3">
            <span className="text-emerald-400 font-bold text-base leading-none">✓</span>
            <span className="text-sm font-semibold text-emerald-300">{success}</span>
          </div>
        )}

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          {pageLoading ? (
            <div className="flex flex-col justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-blue-500" />
              <p className="mt-3 text-xs font-medium text-slate-400">Verifying permissions & loading...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                >
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                >
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                >
                  Password (min 8 chars) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="password"
                  type="text"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* System Role */}
              <div>
                <label
                  htmlFor="role"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                >
                  System Role <span className="text-rose-400">*</span>
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="member">Member</option>
                  {currentUserRole === 'super_admin' && (
                    <option value="admin">Admin</option>
                  )}
                </select>
                {currentUserRole !== 'super_admin' && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Only Super Admins can create Admin accounts.
                  </p>
                )}
              </div>

              {/* Select Project (Optional) */}
              <div>
                <label
                  htmlFor="project"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                >
                  Select Project <span className="text-slate-500 font-normal lowercase">(optional)</span>
                </label>
                <select
                  id="project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="">None (Do not assign to a project yet)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role in Project (only if project is selected) */}
              {selectedProjectId && (
                <div>
                  <label
                    htmlFor="roleInProject"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                  >
                    Role in Project <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="roleInProject"
                    value={roleInProject}
                    onChange={(e) => setRoleInProject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] shadow-lg shadow-blue-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {submitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating User...</span>
                    </div>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}