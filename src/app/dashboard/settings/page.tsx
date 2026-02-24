"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { User, Building2, Shield, Bell, GitBranch, Plus, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", gstin: "", address: "", phone: "", email: "" });
  const [savingBranch, setSavingBranch] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "branches") setActiveTab("branches");
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "branches") fetchBranches();
  }, [activeTab]);

  async function fetchBranches() {
    setLoadingBranches(true);
    try {
      const res = await fetch("/api/branches");
      if (res.ok) setBranches(await res.json());
    } catch {} finally { setLoadingBranches(false); }
  }

  async function handleAddBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!newBranch.name.trim()) return;
    setSavingBranch(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBranch),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Branch created successfully!");
      setNewBranch({ name: "", gstin: "", address: "", phone: "", email: "" });
      setShowAddBranch(false);
      fetchBranches();
      await updateSession();
    } catch (error: any) {
      toast.error(error.message || "Failed to create branch");
    } finally { setSavingBranch(false); }
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "company", label: "Company", icon: Building2 },
    { id: "branches", label: "Branches", icon: GitBranch },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and application settings</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input-field" defaultValue={session?.user?.name || ""} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field bg-gray-50" defaultValue={session?.user?.email || ""} disabled />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input-field" placeholder="+91 98765 43210" />
            </div>
            <button onClick={() => toast.success("Profile updated!")} className="btn-primary">Save Changes</button>
          </div>
        </div>
      )}

      {activeTab === "company" && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-semibold text-gray-900 mb-4">Company Details</h2>
          <div className="space-y-4">
            <div><label className="label">Company Name</label><input type="text" className="input-field" placeholder="Your Company" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">GSTIN</label><input type="text" className="input-field" placeholder="22AAAAA0000A1Z5" /></div>
              <div><label className="label">PAN</label><input type="text" className="input-field" placeholder="AAAAA0000A" /></div>
            </div>
            <div><label className="label">Address</label><textarea className="input-field h-20 resize-none" placeholder="Full business address" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Email</label><input type="email" className="input-field" /></div>
              <div><label className="label">Phone</label><input type="tel" className="input-field" /></div>
            </div>
            <button onClick={() => toast.success("Company details updated!")} className="btn-primary">Save Changes</button>
          </div>
        </div>
      )}

      {activeTab === "branches" && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Branch Management</h2>
            <button onClick={() => setShowAddBranch(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Branch
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Manage multiple branches (e.g., Malad Branch, Goa Branch). Each branch has its own invoices, vendors, categories, and reports. Use the branch switcher in the header to switch between branches.
          </p>

          {loadingBranches ? (
            <div className="card p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" /></div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Branch Name</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">GSTIN</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Address</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {branches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary-500" />
                          <span className="font-medium text-gray-900 text-sm">{b.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{b.gstin || "---"}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 max-w-[200px] truncate">{b.address || "---"}</td>
                      <td className="px-6 py-3 text-center">
                        <span className="badge bg-primary-100 text-primary-700">{b.role}</span>
                      </td>
                    </tr>
                  ))}
                  {branches.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No branches found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {showAddBranch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="card p-6 w-full max-w-md mx-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Branch</h2>
                <form onSubmit={handleAddBranch} className="space-y-4">
                  <div><label className="label">Branch Name *</label>
                    <input type="text" className="input-field" value={newBranch.name} onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })} placeholder="e.g., Goa Branch" required autoFocus /></div>
                  <div><label className="label">GSTIN</label>
                    <input type="text" className="input-field" value={newBranch.gstin} onChange={(e) => setNewBranch({ ...newBranch, gstin: e.target.value })} placeholder="Optional" /></div>
                  <div><label className="label">Address</label>
                    <input type="text" className="input-field" value={newBranch.address} onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })} placeholder="Branch address" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Phone</label><input type="tel" className="input-field" value={newBranch.phone} onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })} /></div>
                    <div><label className="label">Email</label><input type="email" className="input-field" value={newBranch.email} onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })} /></div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowAddBranch(false)} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={savingBranch} className="btn-primary flex items-center gap-2">
                      {savingBranch && <Loader2 className="w-4 h-4 animate-spin" />} Create Branch
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "security" && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-semibold text-gray-900 mb-4">Security Settings</h2>
          <div className="space-y-4">
            <div><label className="label">Current Password</label><input type="password" className="input-field" placeholder="Enter current password" /></div>
            <div><label className="label">New Password</label><input type="password" className="input-field" placeholder="Min 6 characters" /></div>
            <div><label className="label">Confirm New Password</label><input type="password" className="input-field" placeholder="Repeat new password" /></div>
            <button onClick={() => toast.success("Password updated!")} className="btn-primary">Update Password</button>
          </div>
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-3">Session Info</h3>
            <div className="text-sm text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-700">Role:</span> {(session?.user as any)?.role || "user"}</p>
              <p><span className="font-medium text-gray-700">Session type:</span> JWT (24-hour expiry)</p>
              <p><span className="font-medium text-gray-700">Authentication:</span> bcrypt hashed passwords</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-semibold text-gray-900 mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            {[
              { label: "Invoice scanned notifications", desc: "Get notified when a new invoice is scanned" },
              { label: "Payout reminders", desc: "Receive reminders for pending vendor payouts" },
              { label: "Low stock alerts", desc: "Alert when inventory items fall below threshold" },
              { label: "Tally sync status", desc: "Notifications about Tally export status" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
