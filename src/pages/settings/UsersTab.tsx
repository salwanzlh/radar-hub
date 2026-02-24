import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Loader2,
  Check,
  Users,
} from "lucide-react";
import { api, type UserInfo } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function UsersTab() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "viewer" });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: api.users.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { email: string; full_name: string; password: string; role: string }) =>
      api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowCreate(false);
      setForm({ email: "", full_name: "", password: "", role: "viewer" });
      toast.success("User created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { full_name?: string; role?: string; is_active?: boolean } }) =>
      api.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!form.email || !form.full_name || !form.password) return;
    createMutation.mutate({
      email: form.email,
      full_name: form.full_name,
      password: form.password,
      role: form.role,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Manage user accounts, roles, and access.
        </p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="border border-surface-200 rounded-2xl p-6 space-y-5 bg-surface-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="user@mitra.local"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary"
              >
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <button
              onClick={() => {
                setShowCreate(false);
                setForm({ email: "", full_name: "", password: "", role: "viewer" });
              }}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.email || !form.full_name || !form.password || createMutation.isPending}
              className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Create User
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      {users && users.length > 0 ? (
        <div className="border border-surface-200 rounded-[20px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 border-b border-surface-200">
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Email</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Name</th>
                <th className="text-center px-5 py-3 font-medium text-text-secondary">Role</th>
                <th className="text-center px-5 py-3 font-medium text-text-secondary">Active</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Created</th>
                <th className="text-right px-5 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUser?.id}
                  onUpdate={(data) => updateMutation.mutate({ id: u.id, data })}
                  onDelete={() => {
                    if (confirm(`Delete user "${u.full_name}" (${u.email})? This cannot be undone.`)) {
                      deleteMutation.mutate(u.id);
                    }
                  }}
                  isUpdating={updateMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border border-surface-200 rounded-[20px]">
          <Users className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No users found.</p>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: {
  user: UserInfo;
  isSelf: boolean;
  onUpdate: (data: { full_name?: string; role?: string; is_active?: boolean }) => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  const createdDate = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <tr className="hover:bg-surface-100 transition-colors">
      <td className="px-5 py-3.5 text-text-primary">{user.email}</td>
      <td className="px-5 py-3.5 font-medium text-text-primary">
        {user.full_name}
        {isSelf && (
          <span className="ml-1.5 text-[10px] text-brand-accent font-semibold">(you)</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-center">
        <select
          value={user.role}
          onChange={(e) => onUpdate({ role: e.target.value })}
          disabled={isSelf || isUpdating}
          className={cn(
            "px-2.5 py-1 text-xs rounded-lg border bg-surface-100 border-surface-200 text-text-primary focus:outline-none focus:border-brand-accent",
            isSelf && "opacity-50 cursor-not-allowed"
          )}
        >
          <option value="viewer">viewer</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td className="px-5 py-3.5 text-center">
        <button
          onClick={() => onUpdate({ is_active: !user.is_active })}
          disabled={isSelf || isUpdating}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            user.is_active ? "bg-status-success" : "bg-surface-200",
            isSelf && "opacity-50 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              user.is_active ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </td>
      <td className="px-5 py-3.5 text-text-secondary text-xs">{createdDate}</td>
      <td className="px-5 py-3.5 text-right">
        <button
          onClick={onDelete}
          disabled={isSelf || isDeleting}
          className={cn(
            "p-2 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded-xl transition-colors",
            (isSelf || isDeleting) && "opacity-40 cursor-not-allowed"
          )}
          title={isSelf ? "Cannot delete your own account" : "Delete user"}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}
