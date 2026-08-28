import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const [teamMembers, setTeamMembers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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

      // Member role cannot see this page at all
      if (userRole === 'member') {
        navigate('/dashboard', { state: { error: 'Access denied: Team management requires Admin role.' } });
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

      // 4. Fetch all team members from users table
      await fetchAllTeamMembers();
    } catch (err) {
      setError(err.message || 'Error initializing team page.');
    } finally {
      setPageLoading(false);
    }
  };

  const fetchAllTeamMembers = async () => {
    try {
      const { data, error: membersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  useEffect(() => {
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
        `User ${trimmedName} created successfully!`
      );

      // Step 5: Clear form after success
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('member');
      setSelectedProjectId('');
      setRoleInProject('member');

      // Step 6: Refresh team list
      await fetchAllTeamMembers();
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while creating the user.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    const r = role?.toLowerCase();
    if (r === 'super_admin') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Super Admin
        </span>
      );
    }
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
        Member
      </span>
    );
  };

  const filteredMembers = teamMembers.filter((m) => {
    const nameMatch = m.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = m.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || emailMatch;
  });

  return (
    <Layout>
      <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight m-0 leading-tight">
            Team Management
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Provision user accounts, assign roles, and view workspace members
          </p>
        </div>

        {/* Back Navigation Button */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/60 rounded-xl transition-all border border-slate-800/60"
        >
          ← Back to Dashboard
        </Link>
      </header>

      <main className="p-8 flex-1 font-sans space-y-10 max-w-5xl mx-auto">
        {/* Notifications */}
        {error && (
          <div className="bg-red-950/25 border border-red-900/50 p-4 rounded-xl text-sm font-semibold text-red-300 flex items-center justify-between gap-3">
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
          <div className="bg-emerald-950/25 border border-emerald-900/50 p-4 rounded-xl text-sm font-semibold text-emerald-300 flex items-center gap-2 animate-fade-in-up">
            <span>✓</span> {success}
          </div>
        )}

        {pageLoading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-800 border-t-blue-500" />
            <p className="mt-4 text-sm font-medium text-slate-400">Verifying permissions & loading team data...</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: PROVISION NEW MEMBER FORM */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl animate-fade-in-up">
              <div className="border-b border-slate-800/60 pb-4 mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white m-0">Add New Team Member</h2>
                  <p className="text-xs text-slate-400 mt-1 mb-0">
                    Create credentials and assign project permissions
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Fields marked <span className="text-rose-500">*</span> are required
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                    >
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                    >
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                    >
                      Password (min 8 chars) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="password"
                      type="text"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Temporary password"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  {/* System Role */}
                  <div>
                    <label
                      htmlFor="role"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                    >
                      System Role <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    >
                      <option value="member">Member</option>
                      {currentUserRole === 'super_admin' && (
                        <option value="admin">Admin</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Select Project (Optional) */}
                  <div>
                    <label
                      htmlFor="project"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                    >
                      Assign to Project <span className="text-slate-500 font-normal lowercase">(optional)</span>
                    </label>
                    <select
                      id="project"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    >
                      <option value="">None (Do not assign yet)</option>
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
                        Role in Project <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="roleInProject"
                        value={roleInProject}
                        onChange={(e) => setRoleInProject(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  )}
                </div>

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
                      'Create Member Account'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* SECTION 2: EXISTING TEAM MEMBERS DIRECTORY */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800/60">
                <div>
                  <h2 className="text-lg font-bold text-white m-0">Workspace Team Members</h2>
                  <p className="text-xs text-slate-400 mt-1 mb-0">
                    Total {teamMembers.length} users registered in the workspace
                  </p>
                </div>

                {/* Search Input */}
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60">
                  <p className="text-sm font-medium text-slate-500 m-0">No matching team members found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.map((member) => {
                    const initials = (member.full_name || member.email || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <div
                        key={member.id}
                        className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors shadow-sm"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md shadow-blue-500/10">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-100 truncate m-0 leading-tight">
                              {member.full_name || 'Unnamed Member'}
                            </h4>
                            <p className="text-xs text-slate-400 truncate mt-0.5 mb-0">
                              {member.email}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">System Role</span>
                          {getRoleBadge(member.role)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}