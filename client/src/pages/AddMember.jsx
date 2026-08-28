import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { useUserRole } from '../hooks/useUserRole';

export default function AddMember() {
  const navigate = useNavigate();
  const flow1EmailRef = useRef(null);
  const flow1ProjectRef = useRef(null);

  const { role, userId, loading: roleLoading, isSuperAdmin, isAdmin, isMember } = useUserRole();

  // Flow 1 states: Add Existing User to Project
  const [existingUserEmail, setExistingUserEmail] = useState('');
  const [existingUserProjectId, setExistingUserProjectId] = useState('');
  const [existingUserRoleInProject, setExistingUserRoleInProject] = useState('member');
  const [addingToProject, setAddingToProject] = useState(false);

  // Flow 2 states: Create Brand New User
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [newProjectId, setNewProjectId] = useState('');
  const [newRoleInProject, setNewRoleInProject] = useState('member');
  const [creatingUser, setCreatingUser] = useState(false);

  // Role change state for super_admin
  const [updatingRoleId, setUpdatingRoleId] = useState(null);

  // Page states
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    fetchAllTeamMembers();
  }, []);

  useEffect(() => {
    if (!roleLoading) {
      if (isMember) {
        navigate('/dashboard', { state: { error: 'Access denied' }, replace: true });
        return;
      }
      initPage();
    }
  }, [roleLoading, isMember, role, navigate]);

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

      // Fetch projects list scoped by role
      if (isSuperAdmin || role === 'super_admin') {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .order('name', { ascending: true });

        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
      } else {
        // Admin: only their owned projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('owner_id', user.id)
          .order('name', { ascending: true });

        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
      }

      // Fetch all team members from users table
      await fetchAllTeamMembers();
    } catch (err) {
      setError(err.message || 'Error initializing team page.');
    } finally {
      setPageLoading(false);
    }
  };

  // ==========================================
  // FLOW 1: ADD EXISTING USER TO A PROJECT
  // ==========================================
  const handleAddExistingUserToProject = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const enteredEmail = existingUserEmail.trim();

    if (!existingUserProjectId) {
      setError('Please select a project.');
      return;
    }

    if (!enteredEmail) {
      setError('Please enter the user email address.');
      return;
    }

    setAddingToProject(true);

    try {
      // 1. Check if email exists in users table
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('email', enteredEmail)
        .maybeSingle();

      if (userError) throw userError;

      if (!existingUser) {
        setError(`User with email "${enteredEmail}" does not exist. Create an account below in "Create New User".`);
        return;
      }

      // 2. Check first if already a member to avoid duplicates
      const { data: alreadyMember, error: checkError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', existingUserProjectId)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (alreadyMember) {
        setError('User is already a member of this project.');
        return;
      }

      // 3. If user found and not already a member: insert into project_members directly
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: existingUserProjectId,
          user_id: existingUser.id,
          role_in_project: existingUserRoleInProject,
        });

      if (insertError) throw insertError;

      const projectName = projects.find((p) => p.id === existingUserProjectId)?.name || 'the project';
      setSuccess(`${existingUser.full_name || enteredEmail} has been added to ${projectName} successfully!`);
      
      // Reset form
      setExistingUserEmail('');
      setExistingUserRoleInProject('member');
    } catch (err) {
      setError(err.message || 'Failed to add user to project.');
    } finally {
      setAddingToProject(false);
    }
  };

  // ==========================================
  // FLOW 2: CREATE BRAND NEW USER
  // ==========================================
  const handleCreateNewUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = newFullName.trim();
    const trimmedEmail = newEmail.trim();
    const trimmedPassword = newPassword.trim();

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
    if (currentUserRole !== 'super_admin' && newRole === 'admin') {
      setError('Only Super Admins can assign the Admin role.');
      return;
    }

    setCreatingUser(true);

    try {
      // Step 1: Create auth account using supabase.auth.signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: { full_name: trimmedName },
        },
      });

      if (authError) throw authError;

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
          role: newRole,
        });

      if (userInsertError) {
        throw new Error(`Auth account created, but failed to create user record: ${userInsertError.message}`);
      }

      // Step 3: If a project was selected, insert into project_members
      if (newProjectId) {
        const { error: memberInsertError } = await supabase
          .from('project_members')
          .insert({
            project_id: newProjectId,
            user_id: newUserId,
            role_in_project: newRoleInProject,
          });

        if (memberInsertError) {
          throw new Error(`User created, but failed to assign to project: ${memberInsertError.message}`);
        }
      }

      // Step 4: Show success message
      setSuccess(`User ${trimmedName} created successfully!`);

      // Step 5: Clear form after success
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('member');
      setNewProjectId('');
      setNewRoleInProject('member');

      // Step 6: Refresh team list
      await fetchAllTeamMembers();
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while creating the user.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async (targetUserId, newSystemRole) => {
    if (!isSuperAdmin && role !== 'super_admin') {
      setError('Only Super Admins can change user roles.');
      return;
    }

    try {
      setUpdatingRoleId(targetUserId);
      setError(null);
      setSuccess(null);

      const { error: updateErr } = await supabase
        .from('users')
        .update({ role: newSystemRole })
        .eq('id', targetUserId);

      if (updateErr) throw updateErr;

      setTeamMembers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newSystemRole } : u))
      );
      setSuccess('User role updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // Quick pre-fill email into Flow 1
  const handleQuickAddToProject = (userEmail) => {
    setExistingUserEmail(userEmail);
    // Smooth scroll to Flow 1 and focus project or email
    if (flow1ProjectRef.current && !existingUserProjectId) {
      flow1ProjectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flow1ProjectRef.current.focus();
    } else if (flow1EmailRef.current) {
      flow1EmailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flow1EmailRef.current.focus();
    }
  };

  const getRoleBadge = (roleName) => {
    const r = roleName?.toLowerCase();
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

  const fetchAllTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Failed to fetch team members:', err.message);
    }
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
            {isSuperAdmin
              ? 'Add existing users to projects, manage user roles, or create brand new user accounts'
              : 'Add existing users to your workspace projects'}
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

      <main className="p-6 sm:p-8 flex-1 font-sans space-y-8 max-w-6xl mx-auto">
        {/* Notifications */}
        {error && (
          <div className="bg-red-950/25 border border-red-900/50 p-4 rounded-xl text-sm font-semibold text-red-300 flex items-center justify-between gap-3 animate-fade-in-up">
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
            <p className="mt-4 text-sm font-medium text-slate-400">Verifying permissions & loading workspace data...</p>
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-1 ${isSuperAdmin ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto'} gap-8`}>
              {/* ========================================== */}
              {/* FLOW 1: ADD EXISTING USER TO PROJECT       */}
              {/* ========================================== */}
              <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col justify-between animate-fade-in-up">
                <div>
                  <div className="border-b border-slate-800/60 pb-4 mb-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center border border-blue-500/30">
                          {isSuperAdmin ? '1' : '👥'}
                        </span>
                        <h2 className="text-base font-bold text-white m-0">Add Existing User to Project</h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 mb-0">
                        Assign an existing registered user directly to a project
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddExistingUserToProject} className="space-y-4">
                    {/* Project Dropdown */}
                    <div>
                      <label
                        htmlFor="existingUserProject"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                      >
                        Select Project <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="existingUserProject"
                        ref={flow1ProjectRef}
                        required
                        value={existingUserProjectId}
                        onChange={(e) => setExistingUserProjectId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                      >
                        <option value="">-- Choose a project --</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Email of Existing User */}
                    <div>
                      <label
                        htmlFor="existingUserEmail"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                      >
                        User Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="existingUserEmail"
                        ref={flow1EmailRef}
                        type="email"
                        required
                        value={existingUserEmail}
                        onChange={(e) => setExistingUserEmail(e.target.value)}
                        placeholder="e.g. colleague@company.com"
                        className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Must match an existing registered user account.
                      </p>
                    </div>

                    {/* Role in Project */}
                    <div>
                      <label
                        htmlFor="existingUserRoleInProject"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                      >
                        Role in Project <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="existingUserRoleInProject"
                        value={existingUserRoleInProject}
                        onChange={(e) => setExistingUserRoleInProject(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={addingToProject}
                        className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] shadow-lg shadow-blue-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        {addingToProject ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Adding to Project...</span>
                          </div>
                        ) : (
                          'Add to Project'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* ========================================== */}
              {/* FLOW 2: CREATE BRAND NEW USER (Super Admin)*/}
              {/* ========================================== */}
              {isSuperAdmin && (
                <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-xl animate-fade-in-up">
                  <div className="border-b border-slate-800/60 pb-4 mb-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center border border-emerald-500/30">
                          2
                        </span>
                        <h2 className="text-base font-bold text-white m-0">Create New User</h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 mb-0">
                        Create a brand new authentication account and workspace profile
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateNewUser} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div>
                        <label
                          htmlFor="newFullName"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                        >
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="newFullName"
                          type="text"
                          required
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label
                          htmlFor="newEmail"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                        >
                          Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="newEmail"
                          type="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="jane@company.com"
                          className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Password */}
                      <div>
                        <label
                          htmlFor="newPassword"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                        >
                          Password <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="newPassword"
                          type="password"
                          required
                          minLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      {/* System Role */}
                      <div>
                        <label
                          htmlFor="newRole"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                        >
                          System Role <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="newRole"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>
                    </div>

                    {/* Optional Project Assignment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label
                          htmlFor="newProjectId"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                        >
                          Assign to Project <span className="text-slate-500 font-normal lowercase">(optional)</span>
                        </label>
                        <select
                          id="newProjectId"
                          value={newProjectId}
                          onChange={(e) => setNewProjectId(e.target.value)}
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

                      {newProjectId && (
                        <div>
                          <label
                            htmlFor="newRoleInProject"
                            className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                          >
                            Role in Project <span className="text-rose-500">*</span>
                          </label>
                          <select
                            id="newRoleInProject"
                            value={newRoleInProject}
                            onChange={(e) => setNewRoleInProject(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={creatingUser}
                        className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] shadow-lg shadow-emerald-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        {creatingUser ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Creating User Account...</span>
                          </div>
                        ) : (
                          'Create New User'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* ========================================== */}
            {/* EXISTING TEAM MEMBERS DIRECTORY            */}
            {/* ========================================== */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800/60">
                <div>
                  <h2 className="text-lg font-bold text-white m-0">
                    {isSuperAdmin ? 'All Workspace Users' : 'Workspace Users Directory'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 mb-0">
                    Total {teamMembers.length} registered users in the workspace
                  </p>
                </div>

                {/* Search Input */}
                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60">
                  <p className="text-sm font-medium text-slate-500 m-0">No matching users found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3 px-4">User</th>
                        <th className="pb-3 px-4">Email</th>
                        <th className="pb-3 px-4">System Role</th>
                        <th className="pb-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredMembers.map((member) => {
                        const initials = (member.full_name || member.email || 'U')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);

                        return (
                          <tr
                            key={member.id}
                            className="hover:bg-slate-800/30 transition-colors group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm shadow-blue-500/10">
                                  {initials}
                                </div>
                                <span className="text-sm font-semibold text-slate-100">
                                  {member.full_name || 'Unnamed Member'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                              {member.email}
                            </td>
                            <td className="py-3.5 px-4">
                              {isSuperAdmin ? (
                                <select
                                  value={member.role || 'member'}
                                  disabled={updatingRoleId === member.id}
                                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                  className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
                                >
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                  <option value="super_admin">Super Admin</option>
                                </select>
                              ) : (
                                getRoleBadge(member.role)
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleQuickAddToProject(member.email)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded-lg transition-all border border-blue-500/20 hover:border-blue-600 cursor-pointer shadow-sm"
                                title={`Add ${member.email} to a project`}
                              >
                                <span>+</span> Add to Project
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}