import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';

export default function AddMember() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [roleInProject, setRoleInProject] = useState('member');

  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setFetchingProjects(true);
        setError(null);
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          navigate('/');
          return;
        }

        const { data, error: projectsError } = await supabase
          .from('projects')
          .select('id, name');

        if (projectsError) throw projectsError;
        setProjects(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load projects.');
      } finally {
        setFetchingProjects(false);
      }
    };

    fetchProjects();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedProjectId) {
      setError('Please select a project.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!memberEmail || !emailRegex.test(memberEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        navigate('/');
        return;
      }

      // Check if target user exists in users table
      const { data: usersData, error: userFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', memberEmail);

      if (userFetchError) throw userFetchError;

      const foundUser = usersData && usersData.length > 0 ? usersData[0] : null;

      if (foundUser) {
        // Check if member already exists in this project
        const { data: existingMember, error: existingError } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', selectedProjectId)
          .eq('user_id', foundUser.id);

        if (existingError) throw existingError;

        if (existingMember && existingMember.length > 0) {
          setError('This member is already assigned to the selected project.');
          return;
        }

        // Insert into project_members
        const { error: insertMemberError } = await supabase
          .from('project_members')
          .insert([
            {
              project_id: selectedProjectId,
              user_id: foundUser.id,
              role_in_project: roleInProject,
            },
          ]);

        if (insertMemberError) throw insertMemberError;
        setSuccess(`User ${memberEmail} successfully added to the project!`);
      } else {
        // Check if a pending invite already exists
        const { data: existingInvite, error: inviteCheckErr } = await supabase
          .from('invites')
          .select('*')
          .eq('project_id', selectedProjectId)
          .eq('invited_email', memberEmail)
          .eq('status', 'pending');

        if (inviteCheckErr) throw inviteCheckErr;
        if (existingInvite && existingInvite.length > 0) {
          setError('A pending invitation has already been sent to this email.');
          return;
        }

        // User does not exist, insert into invites table
        const { error: insertInviteError } = await supabase
          .from('invites')
          .insert([
            {
              project_id: selectedProjectId,
              invited_email: memberEmail,
              status: 'pending',
              invited_by: currentUser.id,
            },
          ]);

        if (insertInviteError) throw insertInviteError;
        setSuccess(`Invitation successfully sent to ${memberEmail}!`);
      }

      // Reset form fields
      setMemberEmail('');
      setRoleInProject('member');
    } catch (err) {
      setError(err.message || 'An error occurred while adding the member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
            Add Project Member
          </h1>
          <p className="text-sm text-slate-400">
            Assign existing registered users or send project invitations via email.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3">
            <span className="text-rose-400 font-bold text-sm">!</span>
            <span className="text-sm font-medium text-rose-300">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-3">
            <span className="text-emerald-400 font-bold text-sm">✓</span>
            <span className="text-sm font-medium text-emerald-300">{success}</span>
          </div>
        )}

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          {fetchingProjects ? (
            <div className="flex flex-col justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-blue-500" />
              <p className="mt-3 text-xs font-medium text-slate-400">Loading projects...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="project" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Project <span className="text-rose-400">*</span>
                </label>
                <select
                  id="project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="memberEmail" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Member Email <span className="text-rose-400">*</span>
                </label>
                <input
                  id="memberEmail"
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="roleInProject" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Role in Project
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

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] shadow-lg shadow-blue-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Add / Invite Member'
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