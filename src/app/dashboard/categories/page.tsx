"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FolderTree,
  Plus,
  Trash2,
  Loader2,
  Upload,
  Download,
  ChevronRight,
  Search,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

interface PriceInfo {
  [subcategoryName: string]: { price: number; date: string; lowestPrice?: number; lowestVendor?: string; lowestDate?: string } | undefined;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({});

  useEffect(() => {
    fetchCategories();
    fetchPriceInfo();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        // Expand all by default
        setExpandedCats(new Set(data.map((c: Category) => c.id)));
      }
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPriceInfo() {
    try {
      const res = await fetch("/api/categories/prices");
      if (res.ok) {
        const data = await res.json();
        setPriceInfo(data);
      }
    } catch {}
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Category added!");
      setNewCatName("");
      setShowCatModal(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to add category");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSubcategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubName.trim() || !selectedCatId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subcategory",
          name: newSubName.trim(),
          categoryId: selectedCatId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Subcategory added!");
      setNewSubName("");
      setShowSubModal(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to add subcategory");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, type: "category" | "subcategory") {
    if (!confirm(`Delete this ${type}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(
        `/api/categories?id=${id}&type=${type}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success(`${type === "category" ? "Category" : "Subcategory"} deleted`);
        fetchCategories();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  }

  async function handleExcelUpload(e: React.FormEvent) {
    e.preventDefault();
    const formEl = e.target as HTMLFormElement;
    const fileInput = formEl.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/categories/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        `Imported: ${data.categoriesCreated} categories, ${data.subcategoriesCreated} subcategories`
      );
      setShowUploadModal(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function downloadSampleExcel() {
    const csv = "Category,Subcategory\nGrains,Rice\nGrains,Wheat\nGrains,Sugar\nOils,Cooking Oil\nOils,Mustard Oil\nPackaging,Cardboard Boxes\nPackaging,Plastic Bags\nDairy,Milk\nDairy,Butter\nDairy,Cheese\nVegetables,Onion\nVegetables,Potato\nVegetables,Tomato";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "categories_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleExpand(catId: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  // Filter categories/subcategories
  const filtered = categories.filter((cat) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (cat.name.toLowerCase().includes(q)) return true;
    return cat.subcategories.some((s) => s.name.toLowerCase().includes(q));
  });

  // Flatten for table view
  const tableRows: { type: "category" | "subcategory"; id: string; category: string; subcategory: string; catId: string }[] = [];
  for (const cat of filtered) {
    const matchingSubs = search
      ? cat.subcategories.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            cat.name.toLowerCase().includes(search.toLowerCase())
        )
      : cat.subcategories;

    if (matchingSubs.length === 0) {
      tableRows.push({
        type: "category",
        id: cat.id,
        category: cat.name,
        subcategory: "—",
        catId: cat.id,
      });
    } else {
      for (const sub of matchingSubs) {
        tableRows.push({
          type: "subcategory",
          id: sub.id,
          category: cat.name,
          subcategory: sub.name,
          catId: cat.id,
        });
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Categories & Subcategories
          </h1>
          <p className="text-gray-500 mt-1">
            Manage item categories for invoices
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          <button
            onClick={() => setShowSubModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Subcategory
          </button>
          <button
            onClick={() => setShowCatModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories or subcategories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Categories</p>
          <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Subcategories</p>
          <p className="text-2xl font-bold text-gray-900">
            {categories.reduce((s, c) => s + c.subcategories.length, 0)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Showing</p>
          <p className="text-2xl font-bold text-gray-900">{tableRows.length} rows</p>
        </div>
      </div>

      {/* Table View */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Category
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Subcategory (Item)
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Current Price
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Last Purchase Date
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Lowest Price
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Lowest Price Vendor
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Lowest Price Date
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.map((row, idx) => (
                <tr key={`${row.type}-${row.id}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-primary-500" />
                      <span className="font-medium text-gray-900 text-sm">
                        {row.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {row.subcategory}
                  </td>
                  <td className="px-6 py-3 text-right text-sm">
                    {row.type === "subcategory" && priceInfo[row.subcategory]
                      ? <span className="font-semibold text-gray-900">{formatCurrency(priceInfo[row.subcategory]!.price)}</span>
                      : <span className="text-gray-300">---</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-center text-sm text-gray-500">
                    {row.type === "subcategory" && priceInfo[row.subcategory]
                      ? formatDate(priceInfo[row.subcategory]!.date)
                      : <span className="text-gray-300">---</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-right text-sm">
                    {row.type === "subcategory" && priceInfo[row.subcategory]?.lowestPrice != null
                      ? <span className="font-semibold text-green-700">{formatCurrency(priceInfo[row.subcategory]!.lowestPrice!)}</span>
                      : <span className="text-gray-300">---</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-left text-sm text-gray-600">
                    {row.type === "subcategory" && priceInfo[row.subcategory]?.lowestVendor
                      ? priceInfo[row.subcategory]!.lowestVendor
                      : <span className="text-gray-300">---</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-center text-sm text-gray-500">
                    {row.type === "subcategory" && priceInfo[row.subcategory]?.lowestDate
                      ? formatDate(priceInfo[row.subcategory]!.lowestDate!)
                      : <span className="text-gray-300">---</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleDelete(row.id, row.type)}
                      className="text-red-400 hover:text-red-600 p-1"
                      title={`Delete ${row.type}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    {search ? "No matching categories found" : "No categories yet. Add one or import from Excel."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Add Category
            </h2>
            <form onSubmit={handleAddCategory}>
              <div className="mb-4">
                <label className="label">Category Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g., Grains, Oils, Packaging"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subcategory Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Add Subcategory
            </h2>
            <form onSubmit={handleAddSubcategory}>
              <div className="mb-4">
                <label className="label">Category *</label>
                <select
                  className="input-field"
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="label">Subcategory Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="e.g., Rice, Cooking Oil"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Import from Excel
            </h2>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <p className="font-medium mb-1">Expected format:</p>
              <p>Column 1: <strong>Category</strong></p>
              <p>Column 2: <strong>Subcategory</strong> (or Item)</p>
              <button
                type="button"
                onClick={downloadSampleExcel}
                className="mt-2 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Download sample CSV
              </button>
            </div>
            <form onSubmit={handleExcelUpload}>
              <div className="mb-4">
                <label className="label">Upload File *</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="input-field"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn-primary flex items-center gap-2">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  {uploading ? "Importing..." : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
