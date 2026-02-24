"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  CreditCard,
  Loader2,
  CheckCircle2,
  X,
  Clock,
  Banknote,
  FileText,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface InvoiceAllocation {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  outstandingAmount: number;
  allocatedAmount: string;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendorInvoices, setVendorInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);

  const [filterVendor, setFilterVendor] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterInvoice, setFilterInvoice] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [form, setForm] = useState({
    vendorId: "",
    paymentMethod: "bank_transfer",
    paymentRef: "",
    notes: "",
    category: "vendor",
  });

  useEffect(() => {
    Promise.all([fetchPayouts(), fetchVendors()]);
  }, []);

  async function fetchPayouts() {
    try {
      const res = await fetch("/api/payouts");
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
      }
    } catch {
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }

  async function fetchVendors() {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(Array.isArray(data) ? data : []);
      }
    } catch {}
  }

  async function fetchVendorInvoices(vendorId: string) {
    if (!vendorId) {
      setVendorInvoices([]);
      setAllocations([]);
      return;
    }
    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/payouts/vendor-invoices?vendorId=${vendorId}`);
      if (res.ok) {
        const data = await res.json();
        setVendorInvoices(data);
        setAllocations([]);
      }
    } catch {
      toast.error("Failed to load vendor invoices");
    } finally {
      setLoadingInvoices(false);
    }
  }

  function addInvoiceAllocation(invoice: any) {
    if (allocations.find((a) => a.invoiceId === invoice.id)) return;
    setAllocations((prev) => [...prev, {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      totalAmount: invoice.totalAmount,
      outstandingAmount: invoice.outstandingAmount ?? invoice.totalAmount,
      allocatedAmount: String(invoice.outstandingAmount ?? invoice.totalAmount),
    }]);
  }

  function updateAllocation(index: number, amount: string) {
    setAllocations((prev) => prev.map((a, i) => i === index ? { ...a, allocatedAmount: amount } : a));
  }

  function removeAllocation(index: number) {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  }

  const totalAllocated = allocations.reduce((s, a) => s + (parseFloat(a.allocatedAmount) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (allocations.length === 0) {
      toast.error("Please select at least one invoice for payout");
      return;
    }
    if (totalAllocated <= 0) {
      toast.error("Total payout amount must be greater than zero");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: form.vendorId,
          amount: totalAllocated,
          paymentMethod: form.paymentMethod,
          paymentRef: form.paymentRef,
          notes: form.notes,
          category: form.category,
          invoiceAllocations: allocations.map((a) => ({
            invoiceId: a.invoiceId,
            amount: parseFloat(a.allocatedAmount) || 0,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Payout created successfully!");
      setShowModal(false);
      resetForm();
      fetchPayouts();
    } catch (error: any) {
      toast.error(error.message || "Failed to create payout");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm({ vendorId: "", paymentMethod: "bank_transfer", paymentRef: "", notes: "", category: "vendor" });
    setAllocations([]);
    setVendorInvoices([]);
  }

  const totalPending = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalCompleted = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);

  const filteredPayouts = payouts.filter((p) => {
    if (filterVendor && !p.vendor?.name?.toLowerCase().includes(filterVendor.toLowerCase())) return false;
    if (filterMethod && p.paymentMethod !== filterMethod) return false;
    if (filterInvoice && !(p.notes || "").toLowerCase().includes(filterInvoice.toLowerCase())) return false;
    if (filterDate) {
      const payoutDate = new Date(p.createdAt).toISOString().split("T")[0];
      if (payoutDate !== filterDate) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Payouts</h1>
          <p className="text-gray-500 mt-1">Track and manage payments to vendors</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Payout
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><Clock className="w-5 h-5 text-yellow-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCompleted)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Banknote className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Payouts</p>
              <p className="text-xl font-bold text-gray-900">{payouts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Vendor</label>
          <input type="text" className="input-field w-auto" value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)} placeholder="Search vendor..." />
        </div>
        <div>
          <label className="label">Method</label>
          <select className="input-field w-auto" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
            <option value="">All Methods</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
            <option value="cash">Cash</option>
          </select>
        </div>
        <div>
          <label className="label">Invoice #</label>
          <input type="text" className="input-field w-auto" value={filterInvoice} onChange={(e) => setFilterInvoice(e.target.value)} placeholder="Search invoice..." />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input-field w-auto" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
        {(filterVendor || filterMethod || filterInvoice || filterDate) && (
          <button onClick={() => { setFilterVendor(""); setFilterMethod(""); setFilterInvoice(""); setFilterDate(""); }} className="text-sm text-primary-600 hover:text-primary-700 font-medium pb-2.5">
            Clear Filters
          </button>
        )}
      </div>

      {/* Payouts Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" /></div>
        ) : filteredPayouts.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="font-semibold text-gray-700 mb-2">No payouts found</h3>
            <p className="text-gray-400 mb-4">Create your first vendor payout</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">New Payout</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoices</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{payout.vendor?.name}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(payout.amount)}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600 capitalize">{payout.paymentMethod.replace(/_/g, " ")}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {payout.notes || "---"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(payout.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Payout Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">New Payout</h2>
                <p className="text-sm text-gray-500 mt-0.5">Select vendor, choose invoices, and allocate amounts</p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-auto p-6 space-y-4">
                {/* Vendor Selection */}
                <div>
                  <label className="label">Vendor *</label>
                  <select className="input-field" value={form.vendorId}
                    onChange={(e) => { setForm({ ...form, vendorId: e.target.value }); fetchVendorInvoices(e.target.value); }}
                    required>
                    <option value="">Select vendor</option>
                    {vendors.filter((v) => v.isActive).map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Outstanding Invoices */}
                {form.vendorId && (
                  <div>
                    <label className="label">Outstanding Invoices</label>
                    {loadingInvoices ? (
                      <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary-600" /></div>
                    ) : vendorInvoices.length === 0 ? (
                      <p className="text-sm text-gray-400 py-3">No outstanding invoices for this vendor</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-auto">
                        {vendorInvoices.map((inv: any) => {
                          const isSelected = allocations.some((a) => a.invoiceId === inv.id);
                          const outstanding = inv.outstandingAmount ?? inv.totalAmount;
                          return (
                            <button key={inv.id} type="button" onClick={() => !isSelected && addInvoiceAllocation(inv)}
                              className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all flex items-center justify-between ${
                                isSelected ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 hover:border-primary-300 hover:bg-primary-50"
                              }`}>
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                <div>
                                  <span className="font-medium">{inv.invoiceNumber}</span>
                                  <span className="text-gray-400 mx-2">&middot;</span>
                                  <span className="text-gray-500">{formatDate(inv.invoiceDate)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="font-semibold">{formatCurrency(outstanding)}</span>
                                  {outstanding < inv.totalAmount && (
                                    <span className="block text-xs text-gray-400 line-through">{formatCurrency(inv.totalAmount)}</span>
                                  )}
                                </div>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Allocated Invoices with amounts */}
                {allocations.length > 0 && (
                  <div>
                    <label className="label">Payment Allocation</label>
                    <div className="space-y-2">
                      {allocations.map((alloc, idx) => (
                        <div key={alloc.invoiceId} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary-500 flex-shrink-0" />
                              <span className="font-medium text-sm text-gray-900">{alloc.invoiceNumber}</span>
                              <span className="text-xs text-gray-400">(Outstanding: {formatCurrency(alloc.outstandingAmount)})</span>
                            </div>
                          </div>
                          <div className="w-36">
                            <input type="number" className="input-field text-sm text-right font-semibold" value={alloc.allocatedAmount}
                              onChange={(e) => updateAllocation(idx, e.target.value)} min="0" max={alloc.outstandingAmount} step="0.01" placeholder="Amount" />
                          </div>
                          <button type="button" onClick={() => removeAllocation(idx)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-end pt-2 border-t">
                        <div className="text-sm">
                          <span className="text-gray-500">Total Payout:</span>
                          <span className="font-bold text-gray-900 ml-2">{formatCurrency(totalAllocated)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Payment Method</label>
                    <select className="input-field" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="cheque">Cheque</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option value="vendor">Vendor Payment</option>
                      <option value="utility">Utility Bill</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Payment Reference</label>
                  <input type="text" className="input-field" value={form.paymentRef} onChange={(e) => setForm({ ...form, paymentRef: e.target.value })} placeholder="Transaction ID, Cheque No., etc." />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input type="text" className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving || allocations.length === 0} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Creating..." : `Create Payout (${formatCurrency(totalAllocated)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
