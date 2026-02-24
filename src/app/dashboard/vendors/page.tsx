"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Users,
  Loader2,
  Edit,
  Ban,
  Phone,
  Mail,
  MapPin,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  async function fetchVendors() {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingVendor(null);
    setForm({ name: "", gstin: "", pan: "", email: "", phone: "", address: "" });
    setShowModal(true);
  }

  function openEdit(vendor: any) {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name || "",
      gstin: vendor.gstin || "",
      pan: vendor.pan || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingVendor
        ? `/api/vendors/${editingVendor.id}`
        : "/api/vendors";
      const method = editingVendor ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success(editingVendor ? "Vendor updated!" : "Vendor created!");
      setShowModal(false);
      fetchVendors();
    } catch (error: any) {
      toast.error(error.message || "Failed to save vendor");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateVendor(id: string) {
    if (!confirm("Are you sure you want to deactivate this vendor?")) return;
    try {
      await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      toast.success("Vendor deactivated");
      fetchVendors();
    } catch {
      toast.error("Failed to deactivate vendor");
    }
  }

  const filteredVendors = vendors.filter(
    (v) =>
      v.isActive &&
      (v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone?.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-500 mt-1">
            Manage your suppliers and vendors
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors by name, email, or phone..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Vendor Cards */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">No vendors found</h3>
          <p className="text-gray-400 mb-4">Add your first vendor to get started</p>
          <button onClick={openCreate} className="btn-primary">
            Add Vendor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="card p-5 hover:border-primary-200">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(vendor)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deactivateVendor(vendor.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-500">
                {vendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{vendor.email}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{vendor.address}</span>
                  </div>
                )}
                {vendor.gstin && (
                  <p className="text-xs text-gray-400">GSTIN: {vendor.gstin}</p>
                )}
              </div>

              <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                <span>{vendor._count?.invoices || 0} invoices</span>
                <span>{vendor._count?.payouts || 0} payouts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editingVendor ? "Edit Vendor" : "Add Vendor"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Vendor Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Enter vendor name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="vendor@email.com"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">GSTIN</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <label className="label">PAN</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.pan}
                    onChange={(e) => setForm({ ...form, pan: e.target.value })}
                    placeholder="AAAAA0000A"
                  />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea
                  className="input-field h-20 resize-none"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Full business address"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving..." : editingVendor ? "Update Vendor" : "Create Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
