"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  FileText,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

const PAYMENT_COLORS: Record<string, string> = {
  cash: "#22c55e",
  upi: "#8b5cf6",
  card: "#3b82f6",
  swiggy: "#f97316",
  zomato: "#ef4444",
  other: "#64748b",
};

interface AnalyticsData {
  summary: {
    totalPurchases: number;
    totalSales: number;
    totalTax: number;
    totalProfit: number;
    profitMargin: number;
    totalInvoices: number;
    totalSalesCount: number;
    avgInvoiceValue: number;
  };
  monthlyTrends: { month: string; purchases: number; sales: number; profit: number }[];
  topVendors: { name: string; amount: number; count: number }[];
  categoryBreakdown: { name: string; amount: number; subcategoryCount: number }[];
  paymentBreakdown: { method: string; amount: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateFrom, dateTo]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/analytics?${params}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  async function captureChart(selector: string): Promise<string | null> {
    try {
      const el = document.querySelector(selector);
      if (!el) return null;
      const svg = el.querySelector("svg");
      if (!svg) return null;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve) => {
        img.onload = () => {
          canvas.width = img.width * 2;
          canvas.height = img.height * 2;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });
    } catch { return null; }
  }

  async function downloadPDF() {
    if (!data) return;

    toast.loading("Generating PDF with charts...", { id: "pdf" });

    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF("l", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const fmtPDF = (amount: number): string => {
        return "Rs. " + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
      };

      const tableStyles = {
        headStyles: { fillColor: [99, 102, 241] as [number, number, number], fontSize: 10, font: "helvetica" as const, fontStyle: "bold" as const },
        styles: { fontSize: 9, font: "helvetica" as const, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 30, 30);
      doc.text("Analytics Report", 14, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 14, 28);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      doc.text("Summary", 14, 40);

      autoTable(doc, {
        startY: 44,
        head: [["Metric", "Value"]],
        body: [
          ["Total Purchases", fmtPDF(data.summary.totalPurchases)],
          ["Total Sales", fmtPDF(data.summary.totalSales)],
          ["Total Tax (GST)", fmtPDF(data.summary.totalTax)],
          ["Net Profit/Loss", fmtPDF(data.summary.totalProfit)],
          ["Profit Margin", `${data.summary.profitMargin}%`],
          ["Total Invoices", String(data.summary.totalInvoices)],
          ["Avg Invoice Value", fmtPDF(data.summary.avgInvoiceValue)],
        ],
        theme: "grid",
        ...tableStyles,
        columnStyles: { 0: { cellWidth: 60 } },
      });

      // Charts page
      doc.addPage();
      let chartY = 15;

      const hexToRgb = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };

      const drawLegend = (items: { label: string; color: string; value: string }[], startX: number, startY: number) => {
        let y = startY;
        for (const item of items) {
          const rgb = hexToRgb(item.color);
          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.rect(startX, y - 2.5, 4, 4, "F");
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          doc.text(`${item.label}: ${item.value}`, startX + 6, y);
          y += 5;
        }
        return y;
      };

      // Sales vs Purchases chart
      const salesChart = await captureChart("[data-chart='sales-purchases']");
      if (salesChart) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);
        doc.text("Sales vs Purchases (Monthly)", 14, chartY);
        chartY += 4;
        const imgWidth = (pageWidth - 28) / 2;
        const imgHeight = imgWidth * 0.6;
        doc.addImage(salesChart, "PNG", 14, chartY, imgWidth, imgHeight);
        drawLegend([
          { label: "Sales", color: "#22c55e", value: fmtPDF(data.summary.totalSales) },
          { label: "Purchases", color: "#6366f1", value: fmtPDF(data.summary.totalPurchases) },
        ], 14 + imgWidth + 10, chartY + 10);
        chartY += imgHeight + 10;
      }

      // Profit Trend chart
      const profitChart = await captureChart("[data-chart='profit-trend']");
      if (profitChart) {
        if (chartY > pageHeight - 80) { doc.addPage(); chartY = 15; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);
        doc.text("Profit Trend", 14, chartY);
        chartY += 4;
        const imgWidth = (pageWidth - 28) / 2;
        const imgHeight = imgWidth * 0.6;
        doc.addImage(profitChart, "PNG", 14, chartY, imgWidth, imgHeight);
        drawLegend([
          { label: "Profit", color: "#6366f1", value: fmtPDF(data.summary.totalProfit) },
        ], 14 + imgWidth + 10, chartY + 10);
        chartY += imgHeight + 10;
      }

      // Category Pie
      doc.addPage();
      chartY = 15;
      const catChart = await captureChart("[data-chart='category-pie']");
      if (catChart) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);
        doc.text("Category-wise Spending", 14, chartY);
        chartY += 4;
        const imgWidth = (pageWidth - 28) / 2;
        const imgHeight = imgWidth * 0.7;
        doc.addImage(catChart, "PNG", 14, chartY, imgWidth, imgHeight);
        const catLegendItems = data.categoryBreakdown.slice(0, 10).map((cat, i) => ({
          label: cat.name,
          color: COLORS[i % COLORS.length],
          value: fmtPDF(cat.amount),
        }));
        drawLegend(catLegendItems, 14 + imgWidth + 10, chartY + 5);
        chartY += imgHeight + 10;
      }

      // Payment Pie
      if (chartY > pageHeight - 80) { doc.addPage(); chartY = 15; }
      const payChart = await captureChart("[data-chart='payment-pie']");
      if (payChart) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);
        doc.text("Sales by Payment Method", 14, chartY);
        chartY += 4;
        const imgWidth = (pageWidth - 28) / 2;
        const imgHeight = imgWidth * 0.7;
        doc.addImage(payChart, "PNG", 14, chartY, imgWidth, imgHeight);
        const payLegendItems = data.paymentBreakdown.map((p) => ({
          label: p.method.toUpperCase(),
          color: PAYMENT_COLORS[p.method] || "#64748b",
          value: fmtPDF(p.amount),
        }));
        drawLegend(payLegendItems, 14 + imgWidth + 10, chartY + 5);
        chartY += imgHeight + 10;
      }

      // Monthly Trends Table
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      doc.text("Monthly Trends", 14, 20);

      autoTable(doc, {
        startY: 24,
        head: [["Month", "Purchases", "Sales", "Profit"]],
        body: data.monthlyTrends.map((m) => {
          const monthLabel = new Date(m.month + "-01").toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
          });
          return [monthLabel, fmtPDF(m.purchases), fmtPDF(m.sales), fmtPDF(m.profit)];
        }),
        theme: "grid",
        ...tableStyles,
      });

      // Top Vendors
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Top Vendors", 14, finalY);

      if (data.topVendors.length > 0) {
        autoTable(doc, {
          startY: finalY + 4,
          head: [["Vendor", "Purchase Amount", "Invoices"]],
          body: data.topVendors.map((v) => [v.name, fmtPDF(v.amount), String(v.count)]),
          theme: "grid",
          ...tableStyles,
        });
      }

      // Category Breakdown
      finalY = data.topVendors.length > 0 ? (doc as any).lastAutoTable.finalY + 10 : finalY + 10;
      if (finalY > 170) { doc.addPage(); finalY = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Category Spending", 14, finalY);

      if (data.categoryBreakdown.length > 0) {
        autoTable(doc, {
          startY: finalY + 4,
          head: [["Category", "Total Spending"]],
          body: data.categoryBreakdown.map((c) => [c.name, fmtPDF(c.amount)]),
          theme: "grid",
          ...tableStyles,
        });
      }

      // Payment Breakdown
      finalY = data.categoryBreakdown.length > 0 ? (doc as any).lastAutoTable.finalY + 10 : finalY + 10;
      if (finalY > 170) { doc.addPage(); finalY = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Sales by Payment Method", 14, finalY);

      if (data.paymentBreakdown.length > 0) {
        autoTable(doc, {
          startY: finalY + 4,
          head: [["Payment Method", "Total Amount"]],
          body: data.paymentBreakdown.map((p) => [p.method.toUpperCase(), fmtPDF(p.amount)]),
          theme: "grid",
          ...tableStyles,
        });
      }

      doc.save("analytics_report.pdf");
      toast.dismiss("pdf");
      toast.success("PDF downloaded with charts!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.dismiss("pdf");
      toast.error("Failed to generate PDF");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-400">
        Failed to load analytics data
      </div>
    );
  }

  const monthLabels = data.monthlyTrends.map((m) => {
    const d = new Date(m.month + "-01");
    return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  });

  const chartData = data.monthlyTrends.map((m, i) => ({
    ...m,
    name: monthLabels[i],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Board</h1>
          <p className="text-gray-500 mt-1">
            Business insights and performance metrics
          </p>
        </div>
        <button
          onClick={downloadPDF}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      {/* Date Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">From Date</label>
          <input
            type="date"
            className="input-field w-auto"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">To Date</label>
          <input
            type="date"
            className="input-field w-auto"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Purchases</span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(data.summary.totalPurchases)}
          </p>
          <p className="text-xs text-gray-400">{data.summary.totalInvoices} invoices</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Sales</span>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(data.summary.totalSales)}
          </p>
          <p className="text-xs text-gray-400">{data.summary.totalSalesCount} transactions</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Net Profit/Loss</span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              data.summary.totalProfit >= 0 ? "bg-green-100" : "bg-red-100"
            }`}>
              {data.summary.totalProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${
            data.summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {formatCurrency(data.summary.totalProfit)}
          </p>
          <p className="text-xs text-gray-400">
            Margin: {data.summary.profitMargin}%
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Avg Invoice</span>
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(data.summary.avgInvoiceValue)}
          </p>
          <p className="text-xs text-gray-400">
            GST: {formatCurrency(data.summary.totalTax)}
          </p>
        </div>
      </div>

      {/* Charts Row 1: Sales vs Purchases + Profit Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Sales vs Purchases (Monthly)
          </h2>
          <div className="h-80" data-chart="sales-purchases">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Profit Trend
          </h2>
          <div className="h-80" data-chart="profit-trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#6366f1" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Category Pie + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6" data-chart="category-pie">
          <h2 className="font-semibold text-gray-900 mb-4">
            Category-wise Spending
          </h2>
          {data.categoryBreakdown.length > 0 ? (
            <div className="h-80 flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {data.categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {data.categoryBreakdown.slice(0, 8).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-gray-700 truncate max-w-[120px]">{cat.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <p>No category data available. Assign categories to invoice items.</p>
            </div>
          )}
        </div>

        <div className="card p-6" data-chart="payment-pie">
          <h2 className="font-semibold text-gray-900 mb-4">
            Sales by Payment Method
          </h2>
          {data.paymentBreakdown.length > 0 ? (
            <div className="h-80 flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={data.paymentBreakdown}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {data.paymentBreakdown.map((entry) => (
                        <Cell
                          key={entry.method}
                          fill={PAYMENT_COLORS[entry.method] || "#64748b"}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {data.paymentBreakdown.map((p) => (
                  <div key={p.method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: PAYMENT_COLORS[p.method] || "#64748b" }}
                      />
                      <span className="text-gray-700 capitalize">{p.method}</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <p>No sales data available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Vendors Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Top Vendors by Purchase Amount</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Rank
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Vendor
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Total Amount
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Invoices
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Share
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.topVendors.map((v, i) => {
                const share =
                  data.summary.totalPurchases > 0
                    ? (v.amount / data.summary.totalPurchases) * 100
                    : 0;
                return (
                  <tr key={v.name} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-500">
                      #{i + 1}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {v.name}
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(v.amount)}
                    </td>
                    <td className="px-6 py-3 text-sm text-center text-gray-600">
                      {v.count}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[120px]">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.topVendors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No vendor data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
