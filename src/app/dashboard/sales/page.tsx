"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  ShoppingCart,
  Loader2,
  X,
  Banknote,
  Smartphone,
  CreditCard,
  Trash2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote, color: "bg-green-100 text-green-700", iconColor: "text-green-600" },
  { id: "upi", label: "UPI", icon: Smartphone, color: "bg-purple-100 text-purple-700", iconColor: "text-purple-600" },
  { id: "card", label: "Card", icon: CreditCard, color: "bg-blue-100 text-blue-700", iconColor: "text-blue-600" },
  { id: "swiggy", label: "Swiggy", color: "bg-orange-100 text-orange-700", iconColor: "text-orange-600" },
  { id: "zomato", label: "Zomato", color: "bg-red-100 text-red-700", iconColor: "text-red-600" },
  { id: "other", label: "Other", color: "bg-gray-100 text-gray-700", iconColor: "text-gray-600" },
];

interface SaleEntry {
  amount: string;
  paymentMethod: string;
  date: string;
}

function makeEntry(): SaleEntry {
  return { amount: "", paymentMethod: "cash", date: new Date().toISOString().split("T")[0] };
}

export default function SalesPage() {
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<SaleEntry[]>([makeEntry()]);

  useEffect(() => {
    fetchSales();
  }, [selectedDate]);

  async function fetchSales() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setSalesData(data);
      }
    } catch {
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  }

  function updateEntry(index: number, field: keyof SaleEntry, value: string) {
    setEntries((prev) => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  }

  function addEntry() {
    setEntries((prev) => [...prev, makeEntry()]);
  }

  function removeEntry(index: number) {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validEntries = entries.filter((entry) => parseFloat(entry.amount) > 0);
    if (validEntries.length === 0) {
      toast.error("Please add at least one sale with a valid amount");
      return;
    }

    setSaving(true);
    let successCount = 0;

    try {
      for (const entry of validEntries) {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(entry.amount),
            paymentMethod: entry.paymentMethod,
            date: entry.date || selectedDate,
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          const err = await res.json();
          toast.error(`Failed: ${err.error || "Unknown error"}`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} sale${successCount > 1 ? "s" : ""} recorded!`);
        setShowModal(false);
        setEntries([makeEntry()]);
        fetchSales();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to record sales");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSale(id: string) {
    if (!confirm("Delete this sale entry?")) return;
    try {
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Sale deleted");
        fetchSales();
      }
    } catch {
      toast.error("Failed to delete sale");
    }
  }

  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const breakdown = salesData?.breakdown || {};
  const total = salesData?.total || 0;
  const sales = salesData?.sales || [];
  const batchTotal = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 mt-1">
            {isToday ? "Today's" : formatDate(selectedDate)} sales overview and breakdown
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              className="input-field w-auto"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Sale
          </button>
        </div>
      </div>

      {/* Total Sales Card */}
      <div className="card p-6 bg-gradient-to-r from-primary-600 to-blue-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">
              {isToday ? "Today's Total Sales" : `Sales on ${formatDate(selectedDate)}`}
            </p>
            <p className="text-4xl font-extrabold mt-1">
              {formatCurrency(total)}
            </p>
            <p className="text-blue-200 text-sm mt-2">
              {sales.length} transaction{sales.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {PAYMENT_METHODS.map((method) => {
              const amount = breakdown[method.id] || 0;
              const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : "0";
              return (
                <div key={method.id} className="card p-4 text-center">
                  <div className={`w-10 h-10 rounded-lg ${method.color} flex items-center justify-center mx-auto mb-2`}>
                    {method.icon ? (
                      <method.icon className="w-5 h-5" />
                    ) : (
                      <span className="text-xs font-bold">{method.label.charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{method.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(amount)}</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sales List */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Transactions ({sales.length})</h2>
            </div>
            {sales.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">No sales recorded {isToday ? "today" : "on this date"}</h3>
                <p className="text-gray-400 mb-4">Add your first sale to start tracking</p>
                <button onClick={() => setShowModal(true)} className="btn-primary">Add Sale</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((sale: any) => {
                      const method = PAYMENT_METHODS.find((m) => m.id === sale.paymentMethod);
                      return (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className={`badge ${method?.color || "bg-gray-100 text-gray-700"}`}>{method?.label || sale.paymentMethod}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(sale.amount)}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{formatDate(sale.date || sale.createdAt)}</td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => deleteSale(sale.id)} className="text-red-400 hover:text-red-600 p-1" title="Delete">
                              <Trash2 className="w-4 h-4" />
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

      {/* Add Sales Modal - Batch Entry */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Record Sales</h2>
                <p className="text-sm text-gray-500 mt-0.5">Add one or more sales entries at once</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-auto p-6 space-y-4">
                {entries.map((entry, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4 relative">
                    {entries.length > 1 && (
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Sale #{idx + 1}</span>
                        <button type="button" onClick={() => removeEntry(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="label">Amount (&#8377;) *</label>
                        <input type="number" className="input-field font-bold" value={entry.amount} onChange={(e) => updateEntry(idx, "amount", e.target.value)} required min="0.01" step="0.01" placeholder="0.00" autoFocus={idx === 0} />
                      </div>
                      <div>
                        <label className="label">Date</label>
                        <input type="date" className="input-field text-sm" value={entry.date} onChange={(e) => updateEntry(idx, "date", e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Payment Method *</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {PAYMENT_METHODS.map((method) => (
                            <button key={method.id} type="button" onClick={() => updateEntry(idx, "paymentMethod", method.id)}
                              className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${entry.paymentMethod === method.id ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                              {method.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" onClick={addEntry}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add Another Sale
                </button>
              </div>

              <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
                <div className="text-sm">
                  <span className="text-gray-500">{entries.filter((e) => parseFloat(e.amount) > 0).length} entries</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="font-bold text-gray-900">Total: {formatCurrency(batchTotal)}</span>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Saving..." : `Record ${entries.filter((e) => parseFloat(e.amount) > 0).length} Sale(s)`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
