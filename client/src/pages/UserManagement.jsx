import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function UserManagement() {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUsersList(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    // Role restrictions disabled: any user can change roles
    try {
      setUpdatingId(userId);
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setSuccess('User role updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleBadgeStyle = (roleName) => {
    switch (roleName?.toLowerCase()) {
      case 'super_admin':
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 antialiased text-left w-full">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0 leading-tight">
              User Management
            </h1>
            <p className="text-xs text-slate-500 font-medium">Manage system users, permissions, and roles</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
            Total Users: {usersList.length}
          </span>
        </header>

        <main className="p-8 flex-1">
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

          {loading ? (
            <div className="flex flex-col justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm font-medium text-slate-600">Loading user profiles...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-xs tracking-wider">
                      <th className="py-3.5 px-6">User</th>
                      <th className="py-3.5 px-6">Email</th>
                      <th className="py-3.5 px-6">Role</th>
                      <th className="py-3.5 px-6">Joined Date</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          {usr.full_name || 'Unnamed User'}
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-medium">
                          {usr.email}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getRoleBadgeStyle(
                              usr.role
                            )}`}
                          >
                            {usr.role?.replace('_', ' ') || 'member'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 text-xs">
                          {usr.created_at
                            ? new Date(usr.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <select
                            value={usr.role || 'member'}
                            disabled={updatingId === usr.id}
                            onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer disabled:opacity-50"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
