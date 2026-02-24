"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Users,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Clock,
  ShoppingCart,
  IndianRupee,
  Banknote,
  Smartphone,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface DashboardData {
  stats: {
    totalInvoiceAmount: number;
    totalInvoiceCount: number;
    activeVendors: number;
    completedPayouts: number;
    completedPayoutCount: number;
    pendingPayoutAmount: number;
    pendingPayoutCount: number;
    todaySalesTotal: number;
    todaySalesCount: number;
  };
  todaySalesBreakdown: Record<string, number>;
  recentInvoices: any[];
  recentActivity: any[];
  invoicesByStatus: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setData(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6 h-32 bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const salesBreakdown = data?.todaySalesBreakdown || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Overview of your business operations
          </p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary flex items-center gap-2">
          <FileText className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Purchases</span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats?.totalInvoiceAmount || 0)}
          </div>
          <div className="text-xs text-gray-400">
            {stats?.totalInvoiceCount || 0} invoices
          </div>
        </div>

        <Link href="/dashboard/sales" className="stat-card hover:border-green-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Today&apos;s Sales</span>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats?.todaySalesTotal || 0)}
          </div>
          <div className="text-xs text-gray-400">
            {stats?.todaySalesCount || 0} transactions today
          </div>
        </Link>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Active Vendors</span>
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.activeVendors || 0}
          </div>
          <div className="text-xs text-gray-400">Registered vendors</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Pending Payouts</span>
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats?.pendingPayoutAmount || 0)}
          </div>
          <div className="text-xs text-gray-400">
            {stats?.pendingPayoutCount || 0} pending
          </div>
        </div>
      </div>

      {/* Today's Sales Breakdown */}
      {(stats?.todaySalesTotal || 0) > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today&apos;s Sales Breakdown</h2>
            <Link
              href="/dashboard/sales"
              className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { key: "cash", label: "Cash", color: "text-green-600 bg-green-50" },
              { key: "upi", label: "UPI", color: "text-purple-600 bg-purple-50" },
              { key: "card", label: "Card", color: "text-blue-600 bg-blue-50" },
              { key: "swiggy", label: "Swiggy", color: "text-orange-600 bg-orange-50" },
              { key: "zomato", label: "Zomato", color: "text-red-600 bg-red-50" },
              { key: "other", label: "Other", color: "text-gray-600 bg-gray-50" },
            ].map((m) => (
              <div key={m.key} className={`p-3 rounded-lg text-center ${m.color}`}>
                <p className="text-xs font-medium opacity-75">{m.label}</p>
                <p className="text-lg font-bold mt-1">
                  {formatCurrency(salesBreakdown[m.key] || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
            <Link
              href="/dashboard/invoices"
              className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.recentInvoices?.length === 0 && (
              <div className="p-6 text-center text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No invoices yet</p>
                <Link
                  href="/dashboard/invoices/new"
                  className="text-primary-600 text-sm font-medium mt-2 inline-block"
                >
                  Scan your first invoice
                </Link>
              </div>
            )}
            {data?.recentInvoices?.map((inv: any) => (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {inv.invoiceNumber}
                    </p>
                    <p className="text-xs text-gray-400">
                      {inv.vendor?.name || "Unknown"} &middot;{" "}
                      {formatDate(inv.invoiceDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">
                    {formatCurrency(inv.totalAmount)}
                  </p>
                  <span className={`badge text-xs ${getStatusColor(inv.status)}`}>
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.recentActivity?.length === 0 && (
              <div className="p-6 text-center text-gray-400">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No activity yet</p>
              </div>
            )}
            {data?.recentActivity?.map((act: any) => (
              <div key={act.id} className="flex items-start gap-3 p-4">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">{act.details}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(act.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Status Breakdown */}
      {data?.invoicesByStatus && data.invoicesByStatus.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Invoice Status Breakdown
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.invoicesByStatus.map((group: any) => (
              <div
                key={group.status}
                className="p-4 rounded-lg bg-gray-50 text-center"
              >
                <span className={`badge ${getStatusColor(group.status)} mb-2`}>
                  {group.status}
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {group._count}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(group._sum?.totalAmount || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
