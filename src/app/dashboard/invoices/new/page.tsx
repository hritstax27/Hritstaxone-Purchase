"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, ArrowLeft, ChevronDown, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

interface CategoryData {
  id: string;
  name: string;
  subcategories: { id: string; name: string; categoryId: string }[];
}

interface VendorData {
  id: string;
  name: string;
  gstin?: string;
  phone?: string;
}

interface LineItem {
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  gstRate: string;
  unit: string;
}

interface PriceChange {
  itemName: string;
  oldPrice: number;
  newPrice: number;
  lastDate: string;
  lastVendor: string;
  change: number;
  changePercent: number;
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

export default function NewInvoicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [showPricePopup, setShowPricePopup] = useState(false);
  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    vendorId: "",
    vendorGstin: "",
    vendorPhone: "",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { categoryId: "", categoryName: "", subcategoryId: "", description: "", quantity: "1", unitPrice: "", gstRate: "0", unit: "pcs" },
  ]);

  useEffect(() => {
    Promise.all([
      fetch("/api/vendors").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([vendorsData, categoriesData]) => {
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    });
  }, []);

  function handleVendorChange(vendorId: string) {
    const vendor = vendors.find((v) => v.id === vendorId);
    setForm({
      ...form,
      vendorId,
      vendorGstin: vendor?.gstin || "",
      vendorPhone: vendor?.phone || "",
    });
  }

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

  async function checkPriceChanges(): Promise<PriceChange[]> {
    const validItems = lineItems.filter((i) => i.description.trim() && (parseFloat(i.unitPrice) || 0) > 0);
    if (validItems.length === 0) return [];
    try {
      const res = await fetch("/api/invoices/price-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems.map((i) => ({ description: i.description, unitPrice: parseFloat(i.unitPrice) || 0 })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.changes || [];
      }
    } catch {}
    return [];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const changes = await checkPriceChanges();
    if (changes.length > 0) {
      setPriceChanges(changes);
      setShowPricePopup(true);
      setSaving(false);
      return;
    }

    await doSave();
  }

  async function doSave() {
    setSaving(true);
    setShowPricePopup(false);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: form.invoiceNumber,
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate || undefined,
          vendorId: form.vendorId || undefined,
          notes: form.notes || undefined,
          items: lineItems.map((item) => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice) || 0,
            unit: item.unit || "pcs",
            gstRate: parseFloat(item.gstRate) || 0,
            categoryId: item.categoryId || undefined,
            subcategoryId: item.subcategoryId || undefined,
            categoryName: item.categoryName || "Other",
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const invoice = await res.json();
      toast.success("Invoice created successfully!");
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/invoices" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
          <p className="text-gray-500 mt-1">Manually enter purchase invoice details</p>
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
              <select className="input-field" value={form.vendorId} onChange={(e) => handleVendorChange(e.target.value)}>
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">GSTIN</label>
              <input type="text" className="input-field" value={form.vendorGstin} onChange={(e) => setForm({ ...form, vendorGstin: e.target.value })} placeholder="Vendor GSTIN" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="text" className="input-field" value={form.vendorPhone} onChange={(e) => setForm({ ...form, vendorPhone: e.target.value })} placeholder="Vendor phone" />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="label">Notes</label>
              <input type="text" className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
        </div>

        {/* Line Items */}
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
                          value={item.categoryName}
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
          <Link href="/dashboard/invoices" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Create Invoice"}
          </button>
        </div>
      </form>

      {showPricePopup && priceChanges.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Price Changes Detected</h2>
                <p className="text-sm text-gray-500">The following items have different prices compared to their last purchase</p>
              </div>
            </div>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Item</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Old Price</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Vendor</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Date</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">New Price</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {priceChanges.map((pc, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{pc.itemName}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(pc.oldPrice)}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-500">{pc.lastVendor || "—"}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-500">{pc.lastDate ? new Date(pc.lastDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "---"}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(pc.newPrice)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold ${pc.change > 0 ? "text-red-600" : "text-green-600"}`}>
                          {pc.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {pc.change > 0 ? "+" : ""}{formatCurrency(pc.change)} ({pc.changePercent > 0 ? "+" : ""}{pc.changePercent.toFixed(1)}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowPricePopup(false); }} className="btn-secondary">Cancel</button>
              <button onClick={doSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
