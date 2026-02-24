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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "purchase";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const vendorId = searchParams.get("vendorId");
    const vendorIdsParam = searchParams.get("vendorIds");
    const vendorIds = vendorIdsParam ? vendorIdsParam.split(",").filter(Boolean) : [];

    const companyId = session.user.companyId;

    // Build date filter
    const dateFilter: any = {};
    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      dateFilter.gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    switch (type) {
      case "purchase": {
        const where: any = { companyId };
        if (Object.keys(dateFilter).length > 0) where.invoiceDate = dateFilter;
        if (vendorIds.length > 0) where.vendorId = { in: vendorIds };
        else if (vendorId) where.vendorId = vendorId;

        const invoices = await prisma.invoice.findMany({
          where,
          include: {
            vendor: { select: { name: true, gstin: true } },
            items: {
              include: {
                category: { select: { name: true } },
                subcategory: { select: { name: true } },
              },
            },
          },
          orderBy: { invoiceDate: "desc" },
        });

        const totalAmount = invoices.reduce((s, i) => s + i.totalAmount, 0);
        const totalTax = invoices.reduce((s, i) => s + i.taxAmount, 0);

        return NextResponse.json({
          type: "purchase",
          invoices,
          summary: {
            totalInvoices: invoices.length,
            totalAmount,
            totalTax,
            totalSubtotal: totalAmount - totalTax,
          },
        });
      }

      case "rate_variation": {
        // Rate Variation Report: Show price changes for items across invoices
        const invoiceItems = await prisma.invoiceItem.findMany({
          where: {
            invoice: {
              companyId,
              ...(Object.keys(dateFilter).length > 0
                ? { invoiceDate: dateFilter }
                : {}),
            },
          },
          include: {
            invoice: {
              select: {
                invoiceNumber: true,
                invoiceDate: true,
                vendor: { select: { name: true } },
              },
            },
          },
          orderBy: { invoice: { invoiceDate: "desc" } },
        });

        // Group by item description
        const itemMap: Record<string, any[]> = {};
        for (const item of invoiceItems) {
          const key = item.description.toLowerCase().trim();
          if (!itemMap[key]) itemMap[key] = [];
          itemMap[key].push({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
            invoiceNumber: item.invoice.invoiceNumber,
            invoiceDate: item.invoice.invoiceDate,
            vendor: item.invoice.vendor?.name || "Unknown",
          });
        }

        // Calculate rate variations
        const variations = Object.entries(itemMap)
          .filter(([, entries]) => entries.length >= 1)
          .map(([key, entries]) => {
            const prices = entries.map((e) => e.unitPrice);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const variation = maxPrice - minPrice;
            const variationPercent = minPrice > 0 ? ((variation / minPrice) * 100) : 0;

            return {
              item: entries[0].description,
              entries,
              minPrice,
              maxPrice,
              avgPrice: Math.round(avgPrice * 100) / 100,
              variation: Math.round(variation * 100) / 100,
              variationPercent: Math.round(variationPercent * 100) / 100,
              totalPurchases: entries.length,
            };
          })
          .sort((a, b) => b.variationPercent - a.variationPercent);

        return NextResponse.json({ type: "rate_variation", variations });
      }

      case "outstanding": {
        const where: any = {
          companyId,
          status: { notIn: ["paid"] },
        };
        if (Object.keys(dateFilter).length > 0) where.invoiceDate = dateFilter;
        if (vendorIds.length > 0) where.vendorId = { in: vendorIds };
        else if (vendorId) where.vendorId = vendorId;

        const invoices = await prisma.invoice.findMany({
          where,
          include: {
            vendor: { select: { name: true, phone: true, email: true } },
          },
          orderBy: { invoiceDate: "asc" },
        });

        // Calculate aging buckets
        const now = new Date();
        const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

        for (const inv of invoices) {
          const dueDate = inv.dueDate || inv.invoiceDate;
          const days = Math.floor(
            (now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (days <= 0) aging.current += inv.totalAmount;
          else if (days <= 30) aging.days30 += inv.totalAmount;
          else if (days <= 60) aging.days60 += inv.totalAmount;
          else if (days <= 90) aging.days90 += inv.totalAmount;
          else aging.over90 += inv.totalAmount;
        }

        const totalOutstanding = invoices.reduce((s, i) => s + i.totalAmount, 0);

        return NextResponse.json({
          type: "outstanding",
          invoices,
          summary: {
            totalOutstanding,
            totalInvoices: invoices.length,
            aging,
          },
        });
      }

      case "mis": {
        // MIS (Monthly Income Statement): Monthly breakdown of sales vs purchases
        const fromDate = from
          ? new Date(from)
          : new Date(new Date().setMonth(new Date().getMonth() - 11));
        fromDate.setDate(1);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = to ? new Date(to) : new Date();
        toDate.setHours(23, 59, 59, 999);

        const purchases = await prisma.invoice.findMany({
          where: {
            companyId,
            invoiceDate: { gte: fromDate, lte: toDate },
          },
          select: { invoiceDate: true, totalAmount: true, taxAmount: true },
        });

        const sales = await prisma.sale.findMany({
          where: {
            companyId,
            date: { gte: fromDate, lte: toDate },
          },
          select: { date: true, amount: true },
        });

        const monthlyMap: Record<string, { sales: number; purchases: number; tax: number }> = {};
        const current = new Date(fromDate);
        while (current <= toDate) {
          const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
          monthlyMap[key] = { sales: 0, purchases: 0, tax: 0 };
          current.setMonth(current.getMonth() + 1);
        }

        for (const p of purchases) {
          const d = new Date(p.invoiceDate);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (monthlyMap[key]) {
            monthlyMap[key].purchases += p.totalAmount;
            monthlyMap[key].tax += p.taxAmount;
          }
        }

        for (const s of sales) {
          const d = new Date(s.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (monthlyMap[key]) {
            monthlyMap[key].sales += s.amount;
          }
        }

        const months = Object.entries(monthlyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({
            month,
            ...data,
            profit: Math.round((data.sales - data.purchases) * 100) / 100,
            margin:
              data.sales > 0
                ? Math.round(((data.sales - data.purchases) / data.sales) * 10000) / 100
                : 0,
          }));

        const totalSales = months.reduce((s, m) => s + m.sales, 0);
        const totalPurchases = months.reduce((s, m) => s + m.purchases, 0);

        return NextResponse.json({
          type: "mis",
          months,
          summary: {
            totalSales: Math.round(totalSales * 100) / 100,
            totalPurchases: Math.round(totalPurchases * 100) / 100,
            totalProfit: Math.round((totalSales - totalPurchases) * 100) / 100,
            avgMonthlyMargin:
              totalSales > 0
                ? Math.round(((totalSales - totalPurchases) / totalSales) * 10000) / 100
                : 0,
          },
        });
      }

      case "item_wise": {
        const invoiceItems = await prisma.invoiceItem.findMany({
          where: {
            invoice: {
              companyId,
              ...(Object.keys(dateFilter).length > 0
                ? { invoiceDate: dateFilter }
                : {}),
              ...(vendorIds.length > 0
                ? { vendorId: { in: vendorIds } }
                : vendorId ? { vendorId } : {}),
            },
          },
          include: {
            invoice: {
              select: {
                invoiceNumber: true,
                invoiceDate: true,
                totalAmount: true,
                vendor: { select: { name: true } },
              },
            },
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
          },
          orderBy: { invoice: { invoiceDate: "desc" } },
        });

        const items = invoiceItems.map((item) => ({
          description: item.description,
          category: item.category?.name || "—",
          subcategory: item.subcategory?.name || "—",
          quantity: item.quantity,
          unit: item.unit || "pcs",
          invoiceNumber: item.invoice.invoiceNumber,
          invoiceDate: item.invoice.invoiceDate,
          vendor: item.invoice.vendor?.name || "—",
          pricePerUnit: item.unitPrice,
          gstRate: item.gstRate,
          gstAmount: item.gstAmount,
          billAmount: item.totalAmount,
        }));

        const totalQty = items.reduce((s, i) => s + i.quantity, 0);
        const totalBillAmount = items.reduce((s, i) => s + i.billAmount, 0);
        const totalGst = items.reduce((s, i) => s + i.gstAmount, 0);

        return NextResponse.json({
          type: "item_wise",
          items,
          summary: {
            totalItems: items.length,
            totalQuantity: Math.round(totalQty * 100) / 100,
            totalBillAmount: Math.round(totalBillAmount * 100) / 100,
            totalGst: Math.round(totalGst * 100) / 100,
          },
        });
      }

      case "price_history": {
        const itemNamesParam = searchParams.get("itemNames");
        const itemNames = itemNamesParam ? itemNamesParam.split("||").filter(Boolean) : [];

        const allItems = await prisma.invoiceItem.findMany({
          where: { invoice: { companyId } },
          select: { description: true },
          distinct: ["description"],
          orderBy: { description: "asc" },
        });
        const uniqueItems = allItems.map((i) => i.description);

        let history: any[] = [];
        if (itemNames.length > 0) {
          const records = await prisma.invoiceItem.findMany({
            where: {
              description: { in: itemNames },
              invoice: {
                companyId,
                ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {}),
              },
            },
            include: {
              invoice: {
                select: {
                  invoiceNumber: true,
                  invoiceDate: true,
                  vendor: { select: { name: true } },
                },
              },
            },
            orderBy: { invoice: { invoiceDate: "asc" } },
          });

          history = records.map((r) => ({
            date: r.invoice.invoiceDate,
            invoiceNumber: r.invoice.invoiceNumber,
            vendor: r.invoice.vendor?.name || "Unknown",
            quantity: r.quantity,
            unitPrice: r.unitPrice,
            totalAmount: r.totalAmount,
            itemName: r.description,
          }));
        }

        return NextResponse.json({
          type: "price_history",
          items: uniqueItems,
          history,
          selectedItems: itemNames,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
