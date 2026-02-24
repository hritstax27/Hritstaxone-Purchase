import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const sixMonthsAgo = fromParam
      ? (() => { const d = new Date(fromParam); d.setHours(0, 0, 0, 0); return d; })()
      : new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const toDate = toParam
      ? (() => { const d = new Date(toParam); d.setHours(23, 59, 59, 999); return d; })()
      : now;

    // Fetch all data in parallel
    const [invoices, sales, vendors, categoryData, invoiceItems] = await Promise.all([
      // All invoices for the year
      prisma.invoice.findMany({
        where: {
          companyId,
          invoiceDate: { gte: sixMonthsAgo, lte: toDate },
        },
        include: {
          vendor: { select: { name: true } },
          items: {
            include: {
              category: { select: { name: true } },
              subcategory: { select: { name: true } },
            },
          },
        },
        orderBy: { invoiceDate: "asc" },
      }),

      // All sales for the year
      prisma.sale.findMany({
        where: {
          companyId,
          date: { gte: sixMonthsAgo, lte: toDate },
        },
        orderBy: { date: "asc" },
      }),

      // Top vendors
      prisma.invoice.groupBy({
        by: ["vendorId"],
        where: { companyId, vendorId: { not: null } },
        _sum: { totalAmount: true },
        _count: { id: true },
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 10,
      }),

      // Categories with spending
      prisma.category.findMany({
        where: { companyId },
        include: {
          subcategories: true,
          invoiceItems: {
            select: { totalAmount: true },
          },
        },
      }),

      // All invoice items for category analysis
      prisma.invoiceItem.findMany({
        where: {
          invoice: {
            companyId,
            invoiceDate: { gte: sixMonthsAgo, lte: toDate },
          },
        },
        include: {
          category: { select: { name: true } },
          invoice: { select: { invoiceDate: true } },
        },
      }),
    ]);

    // Monthly purchase trends
    const monthlyPurchases: Record<string, number> = {};
    const monthlySales: Record<string, number> = {};
    const current = new Date(sixMonthsAgo);
    while (current <= toDate) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      monthlyPurchases[key] = 0;
      monthlySales[key] = 0;
      current.setMonth(current.getMonth() + 1);
    }

    for (const inv of invoices) {
      const d = new Date(inv.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyPurchases[key] !== undefined) {
        monthlyPurchases[key] += inv.totalAmount;
      }
    }

    for (const sale of sales) {
      const d = new Date(sale.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlySales[key] !== undefined) {
        monthlySales[key] += sale.amount;
      }
    }

    const monthlyTrends = Object.keys(monthlyPurchases).sort().map((month) => ({
      month,
      purchases: Math.round(monthlyPurchases[month] * 100) / 100,
      sales: Math.round(monthlySales[month] * 100) / 100,
      profit: Math.round((monthlySales[month] - monthlyPurchases[month]) * 100) / 100,
    }));

    // Top vendors with names
    const vendorIds = vendors.filter((v) => v.vendorId).map((v) => v.vendorId as string);
    const vendorDetails = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, name: true },
    });
    const vendorNameMap: Record<string, string> = {};
    for (const v of vendorDetails) {
      vendorNameMap[v.id] = v.name;
    }

    const topVendors = vendors.map((v) => ({
      name: vendorNameMap[v.vendorId || ""] || "Unknown",
      amount: Math.round((v._sum.totalAmount || 0) * 100) / 100,
      count: v._count.id,
    }));

    // Category spending
    const categorySpending = categoryData.map((cat) => ({
      name: cat.name,
      amount: Math.round(cat.invoiceItems.reduce((s, i) => s + i.totalAmount, 0) * 100) / 100,
      subcategoryCount: cat.subcategories.length,
    })).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);

    // If no category data, group by invoice item descriptions
    const categoryBreakdown = categorySpending.length > 0
      ? categorySpending
      : (() => {
          const descMap: Record<string, number> = {};
          for (const item of invoiceItems) {
            const cat = item.category?.name || "Uncategorized";
            descMap[cat] = (descMap[cat] || 0) + item.totalAmount;
          }
          return Object.entries(descMap)
            .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100, subcategoryCount: 0 }))
            .sort((a, b) => b.amount - a.amount);
        })();

    // Sales by payment method
    const salesByMethod: Record<string, number> = {};
    for (const sale of sales) {
      salesByMethod[sale.paymentMethod] = (salesByMethod[sale.paymentMethod] || 0) + sale.amount;
    }
    const paymentBreakdown = Object.entries(salesByMethod).map(([method, amount]) => ({
      method,
      amount: Math.round(amount * 100) / 100,
    })).sort((a, b) => b.amount - a.amount);

    // Summary stats
    const totalPurchases = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalSales = sales.reduce((s, i) => s + i.amount, 0);
    const totalTax = invoices.reduce((s, i) => s + i.taxAmount, 0);
    const avgInvoiceValue = invoices.length > 0 ? totalPurchases / invoices.length : 0;

    return NextResponse.json({
      summary: {
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalProfit: Math.round((totalSales - totalPurchases) * 100) / 100,
        profitMargin: totalSales > 0 ? Math.round(((totalSales - totalPurchases) / totalSales) * 10000) / 100 : 0,
        totalInvoices: invoices.length,
        totalSalesCount: sales.length,
        avgInvoiceValue: Math.round(avgInvoiceValue * 100) / 100,
      },
      monthlyTrends,
      topVendors,
      categoryBreakdown,
      paymentBreakdown,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
