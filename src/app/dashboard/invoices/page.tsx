"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  ScanLine,
  Loader2,
  Eye,
  Pencil,
  Calendar,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.vendor?.name?.toLowerCase().includes(term);
    const matchesDate = !dateFilter ||
      new Date(inv.invoiceDate).toISOString().split("T")[0] === dateFilter;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">
            Manage and track all your purchase invoices
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/invoices/scan"
            className="btn-success flex items-center gap-2"
          >
            <ScanLine className="w-4 h-4" />
            Scan Invoice
          </Link>
          <Link
            href="/dashboard/invoices/new"
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Manual Entry
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice # or vendor..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            className="input-field w-auto"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        {(searchTerm || dateFilter) && (
          <button
            onClick={() => { setSearchTerm(""); setDateFilter(""); }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Invoice Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
            <p className="text-gray-500 mt-2">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="font-semibold text-gray-700 mb-2">No invoices found</h3>
            <p className="text-gray-400 mb-4">
              Start by scanning your first invoice
            </p>
            <Link href="/dashboard/invoices/scan" className="btn-primary">
              Scan Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {inv.vendor?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                        <Link
                          href={`/dashboard/invoices/${inv.id}/edit`}
                          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm font-medium"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
