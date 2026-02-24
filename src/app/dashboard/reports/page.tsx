"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Loader2,
  Download,
  FileText,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  History,
  ChevronDown,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const REPORT_TYPES = [
  { id: "purchase", label: "Purchase Report", icon: FileText, desc: "All purchase invoices with details" },
  { id: "rate_variation", label: "Rate Variation", icon: TrendingDown, desc: "Price changes for items across invoices" },
  { id: "price_history", label: "Price History", icon: History, desc: "Track item price changes over time with timeline view" },
  { id: "outstanding", label: "Purchase Outstanding", icon: AlertTriangle, desc: "Unpaid invoices and aging analysis" },
  { id: "mis", label: "MIS Report", icon: BarChart3, desc: "Monthly Income Statement - Sales vs Purchases" },
  { id: "item_wise", label: "Item Wise Report", icon: Package, desc: "Item-level details: qty, unit, price per unit, bill amount" },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("purchase");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
    vendorId: "",
    selectedVendorIds: [] as string[],
    selectedItem: "",
    selectedItems: [] as string[],
    categoryFilter: "",
    itemFilter: "",
  });
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const itemCategories: string[] = reportData?.items
    ? Array.from(new Set(reportData.items.map((i: any) => i.category).filter((c: string) => c && c !== "—"))) as string[]
    : [];
  const itemNames: string[] = reportData?.items
    ? Array.from(new Set(
        reportData.items
          .filter((i: any) => !filters.categoryFilter || i.category === filters.categoryFilter)
          .map((i: any) => i.description)
      )) as string[]
    : [];

  useEffect(() => {
    fetch("/api/vendors").then((r) => r.json()).then((d) => {
      setVendors(Array.isArray(d) ? d : []);
    });
  }, []);

  useEffect(() => {
    fetchReport();
  }, [activeReport, filters]);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeReport,
        from: filters.from,
        to: filters.to,
      });
      if (filters.selectedVendorIds?.length > 0) {
        params.set("vendorIds", filters.selectedVendorIds.join(","));
      } else if (filters.vendorId) {
        params.set("vendorId", filters.vendorId);
      }
      if (activeReport === "price_history" && filters.selectedItems?.length > 0) {
        params.set("itemNames", filters.selectedItems.join("||"));
      }

      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!reportData) return;
    let csv = "";
    let filename = `${activeReport}_report.csv`;

    if (activeReport === "purchase" && reportData.invoices) {
      csv = "Invoice #,Date,Vendor,Subtotal,Tax,Total\n";
      for (const inv of reportData.invoices) {
        csv += `"${inv.invoiceNumber}","${formatDate(inv.invoiceDate)}","${inv.vendor?.name || ""}",${inv.subtotal},${inv.taxAmount},${inv.totalAmount}\n`;
      }
    } else if (activeReport === "rate_variation" && reportData.variations) {
      csv = "Item,Min Price,Max Price,Avg Price,Variation,Variation %,Total Purchases\n";
      for (const v of reportData.variations) {
        csv += `"${v.item}",${v.minPrice},${v.maxPrice},${v.avgPrice},${v.variation},${v.variationPercent}%,${v.totalPurchases}\n`;
      }
    } else if (activeReport === "outstanding" && reportData.invoices) {
      csv = "Invoice #,Date,Due Date,Vendor,Amount\n";
      for (const inv of reportData.invoices) {
        csv += `"${inv.invoiceNumber}","${formatDate(inv.invoiceDate)}","${inv.dueDate ? formatDate(inv.dueDate) : ""}","${inv.vendor?.name || ""}",${inv.totalAmount}\n`;
      }
    } else if (activeReport === "mis" && reportData.months) {
      csv = "Month,Sales,Purchases,Tax,Profit,Margin %\n";
      for (const m of reportData.months) {
        csv += `"${m.month}",${m.sales},${m.purchases},${m.tax},${m.profit},${m.margin}%\n`;
      }
    } else if (activeReport === "price_history" && reportData.history) {
      csv = "Item,Date,Invoice #,Vendor,Quantity,Unit Price,Total Amount\n";
      for (const h of reportData.history) {
        csv += `"${h.itemName || ""}","${formatDate(h.date)}","${h.invoiceNumber}","${h.vendor}",${h.quantity},${h.unitPrice},${h.totalAmount}\n`;
      }
      filename = `price_history.csv`;
    } else if (activeReport === "item_wise" && reportData.items) {
      csv = "Item,Category,Subcategory,Qty,Unit,Invoice #,Invoice Date,Vendor,Price Per Unit,GST %,Bill Amount\n";
      for (const item of reportData.items) {
        csv += `"${item.description}","${item.category}","${item.subcategory}",${item.quantity},"${item.unit}","${item.invoiceNumber}","${formatDate(item.invoiceDate)}","${item.vendor}",${item.pricePerUnit},${item.gstRate},${item.billAmount}\n`;
      }
    }

    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  }

  async function downloadPDF() {
    if (!reportData) return;

    toast.loading("Generating PDF...", { id: "pdf-report" });

    const fmtPDF = (amount: number): string => {
      return "Rs. " + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF("l", "mm", "a4");
      const reportTypeLabel = REPORT_TYPES.find((r) => r.id === activeReport)?.label || activeReport;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(30, 30, 30);
      doc.text(reportTypeLabel, 14, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Period: ${formatDate(filters.from)} to ${formatDate(filters.to)} | Generated: ${new Date().toLocaleDateString("en-IN")}`,
        14,
        26
      );

      const tableStyles = {
        headStyles: { fillColor: [99, 102, 241] as [number, number, number], fontSize: 9, font: "helvetica" as const, fontStyle: "bold" as const },
        styles: { fontSize: 8, font: "helvetica" as const, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
      };

      if (activeReport === "purchase" && reportData.invoices) {
        autoTable(doc, {
          startY: 32,
          head: [["Total Invoices", "Subtotal", "Tax", "Total Amount"]],
          body: [[
            String(reportData.summary?.totalInvoices || 0),
            fmtPDF(reportData.summary?.totalSubtotal || 0),
            fmtPDF(reportData.summary?.totalTax || 0),
            fmtPDF(reportData.summary?.totalAmount || 0),
          ]],
          theme: "grid",
          ...tableStyles,
        });

        const startY = (doc as any).lastAutoTable.finalY + 6;
        autoTable(doc, {
          startY,
          head: [["Invoice #", "Date", "Vendor", "Subtotal", "Tax", "Total"]],
          body: reportData.invoices.map((inv: any) => [
            inv.invoiceNumber,
            formatDate(inv.invoiceDate),
            inv.vendor?.name || "-",
            fmtPDF(inv.subtotal),
            fmtPDF(inv.taxAmount),
            fmtPDF(inv.totalAmount),
          ]),
          theme: "striped",
          ...tableStyles,
        });
      } else if (activeReport === "rate_variation" && reportData.variations) {
        autoTable(doc, {
          startY: 32,
          head: [["Item", "Min Price", "Max Price", "Avg Price", "Variation", "Variation %", "Purchases"]],
          body: reportData.variations.map((v: any) => [
            v.item,
            fmtPDF(v.minPrice),
            fmtPDF(v.maxPrice),
            fmtPDF(v.avgPrice),
            fmtPDF(v.variation),
            `${v.variationPercent}%`,
            String(v.totalPurchases),
          ]),
          theme: "striped",
          ...tableStyles,
        });
      } else if (activeReport === "outstanding" && reportData.invoices) {
        autoTable(doc, {
          startY: 32,
          head: [["Total Outstanding", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days"]],
          body: [[
            fmtPDF(reportData.summary?.totalOutstanding || 0),
            fmtPDF(reportData.summary?.aging?.current || 0),
            fmtPDF(reportData.summary?.aging?.days30 || 0),
            fmtPDF(reportData.summary?.aging?.days60 || 0),
            fmtPDF(reportData.summary?.aging?.days90 || 0),
            fmtPDF(reportData.summary?.aging?.over90 || 0),
          ]],
          theme: "grid",
          ...tableStyles,
        });

        const startY = (doc as any).lastAutoTable.finalY + 6;
        autoTable(doc, {
          startY,
          head: [["Invoice #", "Date", "Due Date", "Vendor", "Amount"]],
          body: reportData.invoices.map((inv: any) => [
            inv.invoiceNumber,
            formatDate(inv.invoiceDate),
            inv.dueDate ? formatDate(inv.dueDate) : "-",
            inv.vendor?.name || "-",
            fmtPDF(inv.totalAmount),
          ]),
          theme: "striped",
          ...tableStyles,
        });
      } else if (activeReport === "mis" && reportData.months) {
        autoTable(doc, {
          startY: 32,
          head: [["Total Sales", "Total Purchases", "Net Profit", "Avg Margin"]],
          body: [[
            fmtPDF(reportData.summary?.totalSales || 0),
            fmtPDF(reportData.summary?.totalPurchases || 0),
            fmtPDF(reportData.summary?.totalProfit || 0),
            `${reportData.summary?.avgMonthlyMargin || 0}%`,
          ]],
          theme: "grid",
          ...tableStyles,
        });

        const startY = (doc as any).lastAutoTable.finalY + 6;
        autoTable(doc, {
          startY,
          head: [["Month", "Sales", "Purchases", "Profit", "Margin %"]],
          body: reportData.months.map((m: any) => {
            const monthLabel = new Date(m.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
            return [monthLabel, fmtPDF(m.sales), fmtPDF(m.purchases), fmtPDF(m.profit), `${m.margin}%`];
          }),
          theme: "striped",
          ...tableStyles,
        });
      } else if (activeReport === "price_history" && reportData.history) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Items: ${filters.selectedItems.length} selected`, 14, 32);

        autoTable(doc, {
          startY: 38,
          head: [["Item", "Date", "Invoice #", "Vendor", "Qty", "Unit Price", "Total"]],
          body: reportData.history.map((h: any) => [
            h.itemName || "",
            formatDate(h.date),
            h.invoiceNumber,
            h.vendor,
            String(h.quantity),
            fmtPDF(h.unitPrice),
            fmtPDF(h.totalAmount),
          ]),
          theme: "striped",
          ...tableStyles,
        });
      } else if (activeReport === "item_wise" && reportData.items) {
        autoTable(doc, {
          startY: 32,
          head: [["Total Items", "Total Quantity", "Total GST", "Total Bill Amount"]],
          body: [[
            String(reportData.summary?.totalItems || 0),
            String(reportData.summary?.totalQuantity || 0),
            fmtPDF(reportData.summary?.totalGst || 0),
            fmtPDF(reportData.summary?.totalBillAmount || 0),
          ]],
          theme: "grid",
          ...tableStyles,
        });

        const startY = (doc as any).lastAutoTable.finalY + 6;
        autoTable(doc, {
          startY,
          head: [["Item", "Category", "Qty", "Unit", "Invoice #", "Price/Unit", "GST %", "Bill Amount"]],
          body: reportData.items.map((item: any) => [
            item.description,
            item.category,
            String(item.quantity),
            item.unit,
            item.invoiceNumber,
            fmtPDF(item.pricePerUnit),
            `${item.gstRate}%`,
            fmtPDF(item.billAmount),
          ]),
          theme: "striped",
          ...tableStyles,
          columnStyles: { 0: { cellWidth: 40 } },
        });
      }

      doc.save(`${activeReport}_report.pdf`);
      toast.dismiss("pdf-report");
      toast.success("PDF downloaded!");
    } catch (error) {
      console.error("PDF error:", error);
      toast.dismiss("pdf-report");
      toast.error("Failed to generate PDF");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">
            Generate and analyze business reports
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCSV}
            disabled={!reportData || loading}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={downloadPDF}
            disabled={!reportData || loading}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            onClick={() => setActiveReport(rt.id)}
            className={`card p-4 text-left transition-all ${
              activeReport === rt.id
                ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                : "hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeReport === rt.id ? "bg-primary-100" : "bg-gray-100"
              }`}>
                <rt.icon className={`w-5 h-5 ${
                  activeReport === rt.id ? "text-primary-600" : "text-gray-500"
                }`} />
              </div>
              <div>
                <p className={`font-semibold text-sm ${
                  activeReport === rt.id ? "text-primary-700" : "text-gray-900"
                }`}>
                  {rt.label}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2">{rt.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        {activeReport !== "outstanding" && (
          <>
            <div>
              <label className="label">From Date</label>
              <input
                type="date"
                className="input-field w-auto"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </div>
            <div>
              <label className="label">To Date</label>
              <input
                type="date"
                className="input-field w-auto"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </div>
          </>
        )}
        {(activeReport === "purchase" || activeReport === "outstanding" || activeReport === "item_wise") && (
          <div>
            <label className="label">Vendor</label>
            <div className="relative">
              <button
                type="button"
                className="input-field w-auto min-w-[200px] text-left flex items-center justify-between"
                onClick={() => setShowVendorDropdown(!showVendorDropdown)}
              >
                <span className="truncate text-sm">
                  {filters.selectedVendorIds.length === 0
                    ? "All Vendors"
                    : filters.selectedVendorIds.length === vendors.length
                    ? "All Vendors"
                    : `${filters.selectedVendorIds.length} vendor(s)`}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
              </button>
              {showVendorDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowVendorDropdown(false)} />
                  <div className="absolute z-20 left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-primary-50 border-b border-gray-100 flex items-center gap-2"
                      onClick={() => {
                        if (filters.selectedVendorIds.length === vendors.length) {
                          setFilters({ ...filters, selectedVendorIds: [], vendorId: "" });
                        } else {
                          setFilters({ ...filters, selectedVendorIds: vendors.map((v: any) => v.id), vendorId: "" });
                        }
                      }}
                    >
                      <input type="checkbox" checked={filters.selectedVendorIds.length === vendors.length && vendors.length > 0} readOnly className="rounded border-gray-300" />
                      Select All
                    </button>
                    {vendors.map((v: any) => (
                      <button
                        type="button"
                        key={v.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center gap-2"
                        onClick={() => {
                          const sel = filters.selectedVendorIds.includes(v.id)
                            ? filters.selectedVendorIds.filter((id: string) => id !== v.id)
                            : [...filters.selectedVendorIds, v.id];
                          setFilters({ ...filters, selectedVendorIds: sel, vendorId: "" });
                        }}
                      >
                        <input type="checkbox" checked={filters.selectedVendorIds.includes(v.id)} readOnly className="rounded border-gray-300" />
                        {v.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {activeReport === "price_history" && reportData?.items && (
          <div>
            <label className="label">Select Items</label>
            <div className="relative">
              <button
                type="button"
                className="input-field w-auto min-w-[250px] text-left flex items-center justify-between"
                onClick={() => setShowItemDropdown(!showItemDropdown)}
              >
                <span className="truncate text-sm">
                  {filters.selectedItems.length === 0
                    ? "-- Select items --"
                    : filters.selectedItems.length === reportData.items.length
                    ? "All Items"
                    : `${filters.selectedItems.length} item(s) selected`}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
              </button>
              {showItemDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowItemDropdown(false)} />
                  <div className="absolute z-20 left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-primary-50 border-b border-gray-100 flex items-center gap-2"
                      onClick={() => {
                        if (filters.selectedItems.length === reportData.items.length) {
                          setFilters({ ...filters, selectedItems: [], selectedItem: "" });
                        } else {
                          setFilters({ ...filters, selectedItems: [...reportData.items], selectedItem: reportData.items[0] });
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={filters.selectedItems.length === reportData.items.length}
                        readOnly
                        className="rounded border-gray-300"
                      />
                      Select All
                    </button>
                    {reportData.items.map((item: string) => (
                      <button
                        type="button"
                        key={item}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center gap-2"
                        onClick={() => {
                          const sel = filters.selectedItems.includes(item)
                            ? filters.selectedItems.filter((s: string) => s !== item)
                            : [...filters.selectedItems, item];
                          setFilters({ ...filters, selectedItems: sel, selectedItem: sel[0] || "" });
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filters.selectedItems.includes(item)}
                          readOnly
                          className="rounded border-gray-300"
                        />
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {activeReport === "item_wise" && (
          <>
            <div>
              <label className="label">Category</label>
              <select
                className="input-field w-auto"
                value={filters.categoryFilter}
                onChange={(e) => setFilters({ ...filters, categoryFilter: e.target.value })}
              >
                <option value="">All Categories</option>
                {itemCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Item</label>
              <select
                className="input-field w-auto min-w-[200px]"
                value={filters.itemFilter}
                onChange={(e) => setFilters({ ...filters, itemFilter: e.target.value })}
              >
                <option value="">All Items</option>
                {itemNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
          <p className="text-gray-500 mt-2">Generating report...</p>
        </div>
      ) : (
        <>
          {/* Purchase Report */}
          {activeReport === "purchase" && reportData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.summary?.totalInvoices || 0}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Subtotal</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary?.totalSubtotal || 0)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Tax (GST)</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary?.totalTax || 0)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold text-primary-600">{formatCurrency(reportData.summary?.totalAmount || 0)}</p>
                </div>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tax</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.invoices?.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900 text-sm">{inv.invoiceNumber}</td>
                          <td className="px-6 py-3 text-sm text-gray-600">{formatDate(inv.invoiceDate)}</td>
                          <td className="px-6 py-3 text-sm text-gray-600">{inv.vendor?.name || "—"}</td>
                          <td className="px-6 py-3 text-sm text-right text-gray-600">{formatCurrency(inv.subtotal)}</td>
                          <td className="px-6 py-3 text-sm text-right text-gray-600">{formatCurrency(inv.taxAmount)}</td>
                          <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(!reportData.invoices || reportData.invoices.length === 0) && (
                  <div className="p-8 text-center text-gray-400">No invoices found for the selected period</div>
                )}
              </div>
            </div>
          )}

          {/* Rate Variation Report */}
          {activeReport === "rate_variation" && reportData && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Min Price</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Max Price</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Avg Price</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Variation</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Variation %</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Purchases</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.variations?.map((v: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900 text-sm">{v.item}</td>
                        <td className="px-6 py-3 text-sm text-right text-green-600">{formatCurrency(v.minPrice)}</td>
                        <td className="px-6 py-3 text-sm text-right text-red-600">{formatCurrency(v.maxPrice)}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-600">{formatCurrency(v.avgPrice)}</td>
                        <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(v.variation)}</td>
                        <td className="px-6 py-3 text-sm text-right">
                          <span className={`font-semibold ${v.variationPercent > 10 ? "text-red-600" : v.variationPercent > 5 ? "text-orange-600" : "text-green-600"}`}>
                            {v.variationPercent}%
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center text-sm text-gray-500">{v.totalPurchases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!reportData.variations || reportData.variations.length === 0) && (
                <div className="p-8 text-center text-gray-400">No item data found for rate comparison</div>
              )}
            </div>
          )}

          {/* Purchase Outstanding Report */}
          {activeReport === "outstanding" && reportData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="stat-card">
                  <p className="text-xs text-gray-500">Total Outstanding</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(reportData.summary?.totalOutstanding || 0)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(reportData.summary?.aging?.current || 0)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs text-gray-500">1-30 Days</p>
                  <p className="text-lg font-bold text-yellow-600">{formatCurrency(reportData.summary?.aging?.days30 || 0)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs text-gray-500">31-60 Days</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(reportData.summary?.aging?.days60 || 0)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs text-gray-500">61-90 Days</p>
                  <p className="text-lg font-bold text-red-500">{formatCurrency(reportData.summary?.aging?.days90 || 0)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs text-gray-500">90+ Days</p>
                  <p className="text-lg font-bold text-red-700">{formatCurrency(reportData.summary?.aging?.over90 || 0)}</p>
                </div>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.invoices?.map((inv: any) => {
                        const dueDate = inv.dueDate || inv.invoiceDate;
                        const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)));
                        return (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-gray-900 text-sm">{inv.invoiceNumber}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{formatDate(inv.invoiceDate)}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{inv.vendor?.name || "—"}</td>
                            <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                            <td className="px-6 py-3 text-center">
                              <span className={`font-semibold text-sm ${daysOverdue > 60 ? "text-red-600" : daysOverdue > 30 ? "text-orange-600" : daysOverdue > 0 ? "text-yellow-600" : "text-green-600"}`}>
                                {daysOverdue > 0 ? `${daysOverdue} days` : "Current"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(!reportData.invoices || reportData.invoices.length === 0) && (
                  <div className="p-8 text-center text-gray-400">No outstanding invoices found</div>
                )}
              </div>
            </div>
          )}

          {/* MIS Report */}
          {activeReport === "mis" && reportData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary?.totalSales || 0)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Total Purchases</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.summary?.totalPurchases || 0)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Net Profit/Loss</p>
                  <p className={`text-2xl font-bold ${(reportData.summary?.totalProfit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(reportData.summary?.totalProfit || 0)}
                  </p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Avg Margin</p>
                  <p className={`text-2xl font-bold ${(reportData.summary?.avgMonthlyMargin || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {reportData.summary?.avgMonthlyMargin || 0}%
                  </p>
                </div>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Sales</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Purchases</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Profit/Loss</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.months?.map((m: any) => {
                        const monthLabel = new Date(m.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                        return (
                          <tr key={m.month} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-gray-900 text-sm">{monthLabel}</td>
                            <td className="px-6 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(m.sales)}</td>
                            <td className="px-6 py-3 text-sm text-right text-red-600 font-medium">{formatCurrency(m.purchases)}</td>
                            <td className="px-6 py-3 text-sm text-right font-bold">
                              <span className={m.profit >= 0 ? "text-green-600" : "text-red-600"}>
                                {m.profit >= 0 ? "+" : ""}{formatCurrency(m.profit)}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm text-right">
                              <span className={`font-semibold ${m.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {m.margin}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(!reportData.months || reportData.months.length === 0) && (
                  <div className="p-8 text-center text-gray-400">No data found for the selected period</div>
                )}
              </div>
            </div>
          )}

          {/* Price History Report */}
          {activeReport === "price_history" && reportData && (
            <div className="space-y-4">
              {filters.selectedItems.length === 0 ? (
                <div className="card p-12 text-center text-gray-400">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold text-gray-700 mb-2">Select Items</h3>
                  <p>Choose one or more items from the dropdown above to view price history</p>
                </div>
              ) : reportData.history?.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="stat-card">
                      <p className="text-sm text-gray-500">Items Selected</p>
                      <p className="text-lg font-bold text-gray-900">{filters.selectedItems.length}</p>
                    </div>
                    <div className="stat-card">
                      <p className="text-sm text-gray-500">Purchase Count</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData.history.length}</p>
                    </div>
                    <div className="stat-card">
                      <p className="text-sm text-gray-500">Min Price</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(Math.min(...reportData.history.map((h: any) => h.unitPrice)))}
                      </p>
                    </div>
                    <div className="stat-card">
                      <p className="text-sm text-gray-500">Max Price</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(Math.max(...reportData.history.map((h: any) => h.unitPrice)))}
                      </p>
                    </div>
                  </div>
                  <div className="card overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Price Timeline</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                            <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.history.map((h: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-6 py-3 text-sm font-medium text-gray-900">{h.itemName || h.description}</td>
                              <td className="px-6 py-3 text-sm text-gray-600">{formatDate(h.date)}</td>
                              <td className="px-6 py-3 text-sm text-gray-600">{h.invoiceNumber}</td>
                              <td className="px-6 py-3 text-sm text-gray-600">{h.vendor}</td>
                              <td className="px-6 py-3 text-sm text-center text-gray-600">{h.quantity}</td>
                              <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(h.unitPrice)}</td>
                              <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(h.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card p-8 text-center text-gray-400">
                  No price history found for selected items in the selected period
                </div>
              )}
            </div>
          )}

          {/* Item Wise Report */}
          {activeReport === "item_wise" && reportData && (() => {
            const filteredItems = (reportData.items || []).filter((item: any) => {
              if (filters.categoryFilter && item.category !== filters.categoryFilter) return false;
              if (filters.itemFilter && item.description !== filters.itemFilter) return false;
              return true;
            });
            const fTotalQty = filteredItems.reduce((s: number, i: any) => s + i.quantity, 0);
            const fTotalGst = filteredItems.reduce((s: number, i: any) => s + i.gstAmount, 0);
            const fTotalBill = filteredItems.reduce((s: number, i: any) => s + i.billAmount, 0);
            return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Total Line Items</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Total Quantity</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(fTotalQty * 100) / 100}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Total GST</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(fTotalGst)}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-gray-500">Total Bill Amount</p>
                  <p className="text-2xl font-bold text-primary-600">{formatCurrency(fTotalBill)}</p>
                </div>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unit</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price/Unit</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GST %</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bill Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredItems.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900 text-sm">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-500">{item.unit}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.invoiceNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.vendor}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.pricePerUnit)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-500">{item.gstRate}%</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(item.billAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredItems.length === 0 && (
                  <div className="p-8 text-center text-gray-400">No item data found for the selected filters</div>
                )}
              </div>
            </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
