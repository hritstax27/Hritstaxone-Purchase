"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pencil,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  async function fetchInvoice() {
    try {
      const res = await fetch(`/api/invoices/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      } else {
        toast.error("Invoice not found");
        router.push("/dashboard/invoices");
      }
    } catch {
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice {invoice.invoiceNumber}
            </h1>
          </div>
        </div>
        <Link
          href={`/dashboard/invoices/${params.id}/edit`}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Pencil className="w-4 h-4" />
          Edit Invoice
        </Link>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Invoice Number</span>
                <p className="font-medium text-gray-900">
                  {invoice.invoiceNumber}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Invoice Date</span>
                <p className="font-medium text-gray-900">
                  {formatDate(invoice.invoiceDate)}
                </p>
              </div>
              {invoice.dueDate && (
                <div>
                  <span className="text-gray-500">Due Date</span>
                  <p className="font-medium text-gray-900">
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Vendor</span>
                <p className="font-medium text-gray-900">
                  {invoice.vendor?.name || "Not assigned"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Created By</span>
                <p className="font-medium text-gray-900">
                  {invoice.user?.name}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Created On</span>
                <p className="font-medium text-gray-900">
                  {formatDate(invoice.createdAt)}
                </p>
              </div>
            </div>
            {invoice.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500">Notes:</span>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                      #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                      Item
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">
                      Qty
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                      Unit Price
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                      GST %
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item: any, i: number) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.category?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.subcategory?.name || item.description}
                        {item.unit && item.unit !== "pcs" && (
                          <span className="text-xs text-gray-400 ml-1">({item.unit})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {item.gstRate}%
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax (GST)</span>
                <span className="font-medium">
                  {formatCurrency(invoice.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {invoice.vendor && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Vendor Details
              </h2>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">{invoice.vendor.name}</p>
                {invoice.vendor.gstin && (
                  <p className="text-gray-500">GSTIN: {invoice.vendor.gstin}</p>
                )}
                {invoice.vendor.email && (
                  <p className="text-gray-500">{invoice.vendor.email}</p>
                )}
                {invoice.vendor.phone && (
                  <p className="text-gray-500">{invoice.vendor.phone}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
