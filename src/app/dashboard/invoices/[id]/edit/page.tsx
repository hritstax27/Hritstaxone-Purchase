"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface CategoryData {
  id: string;
  name: string;
  subcategories: { id: string; name: string; categoryId: string }[];
}

function ComboBox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string, id?: string) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          type="text"
          className="input-field text-sm pr-8"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
          onClick={() => setOpen(!open)}
          tabIndex={-1}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.map((o) => (
            <button
              type="button"
              key={o.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 hover:text-primary-700"
              onClick={() => {
                setSearch(o.name);
                onChange(o.name, o.id);
                setOpen(false);
              }}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    vendorId: "",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${params.id}`).then((r) => r.json()),
      fetch("/api/vendors").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([invoice, vendorsData, categoriesData]) => {
      if (!invoice || invoice.error) {
        toast.error("Invoice not found");
        router.push("/dashboard/invoices");
        return;
      }
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setForm({
        invoiceNumber: invoice.invoiceNumber || "",
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split("T")[0] : "",
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "",
        vendorId: invoice.vendorId || "",
        notes: invoice.notes || "",
      });
      setLineItems(
        (invoice.items || []).map((item: any) => ({
          categoryId: item.categoryId || "",
          categoryName: item.category?.name || "",
          subcategoryId: item.subcategoryId || "",
          description: item.subcategory?.name || item.description || "",
          quantity: String(item.quantity || 1),
          unitPrice: String(item.unitPrice || 0),
          gstRate: String(item.gstRate || 0),
          unit: item.unit || "pcs",
        }))
      );
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load invoice");
      setLoading(false);
    });
  }, [params.id, router]);

  function addLineItem() {
    setLineItems([...lineItems, { categoryId: "", categoryName: "", subcategoryId: "", description: "", quantity: "1", unitPrice: "", gstRate: "0", unit: "pcs" }]);
  }

  function updateLineItem(index: number, field: string, value: any) {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  }

  function updateCategory(index: number, name: string, id?: string) {
    const updated = [...lineItems];
    updated[index].categoryName = name;
    updated[index].categoryId = id || "";
    updated[index].subcategoryId = "";
    updated[index].description = "";
    setLineItems(updated);
  }

  function updateSubcategory(index: number, name: string, id?: string) {
    const updated = [...lineItems];
    updated[index].description = name;
    updated[index].subcategoryId = id || "";
    setLineItems(updated);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  const subtotal = lineItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
  const taxAmount = lineItems.reduce((s, i) => s + ((parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0) * (parseFloat(i.gstRate) || 0)) / 100, 0);
  const total = subtotal + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          vendorId: form.vendorId || undefined,
          items: lineItems.map((item) => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice) || 0,
            unit: item.unit || "pcs",
            gstRate: parseFloat(item.gstRate) || 0,
            categoryId: item.categoryId || undefined,
            subcategoryId: item.subcategoryId || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Invoice updated successfully!");
      router.push(`/dashboard/invoices/${params.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update invoice");
    } finally {
      setSaving(false);
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
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/invoices/${params.id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
          <p className="text-gray-500 mt-1">Modify invoice details and line items</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Invoice Number *</label>
              <input type="text" className="input-field" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} required placeholder="INV-001" />
            </div>
            <div>
              <label className="label">Invoice Date *</label>
              <input type="date" className="input-field" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input-field" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Vendor</label>
              <select className="input-field" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
                <option value="">Select vendor</option>
                {vendors.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Notes</label>
              <input type="text" className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Line Items</h2>
            <button type="button" onClick={addLineItem} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          <div className="overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Category</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Item (Subcategory)</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 w-20">Qty</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 w-28">Unit Price</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 w-20">GST %</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-28">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => {
                  const qty = parseFloat(item.quantity) || 0;
                  const price = parseFloat(item.unitPrice) || 0;
                  const gst = parseFloat(item.gstRate) || 0;
                  const lineTotal = qty * price * (1 + gst / 100);
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-2">
                        <ComboBox
                          value={item.categoryName || ""}
                          onChange={(name, id) => updateCategory(i, name, id)}
                          options={categories.map((c) => ({ id: c.id, name: c.name }))}
                          placeholder="Type or select category"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <ComboBox
                          value={item.description}
                          onChange={(name, id) => updateSubcategory(i, name, id)}
                          options={(item.categoryId
                            ? categories.filter((c) => c.id === item.categoryId)
                            : categories
                          ).flatMap((c) => c.subcategories).map((s) => ({ id: s.id, name: s.name }))}
                          placeholder="Type or select item"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" inputMode="decimal" className="input-field text-sm text-center [appearance:textfield]" value={item.quantity} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) updateLineItem(i, "quantity", v); }} required />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" inputMode="decimal" className="input-field text-sm text-center [appearance:textfield]" value={item.unitPrice} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) updateLineItem(i, "unitPrice", v); }} placeholder="0" required />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" inputMode="decimal" className="input-field text-sm text-center [appearance:textfield]" value={item.gstRate} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) updateLineItem(i, "gstRate", v); }} />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-sm">
                        ₹{lineTotal.toFixed(2)}
                      </td>
                      <td className="px-1 py-2">
                        <button type="button" onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal:</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GST:</span>
                <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href={`/dashboard/invoices/${params.id}`} className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Update Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
