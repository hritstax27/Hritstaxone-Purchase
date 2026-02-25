export const dynamic = "force-dynamic";
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

    // Today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalInvoices,
      totalVendors,
      totalPayouts,
      pendingPayouts,
      recentInvoices,
      recentActivity,
      invoicesByStatus,
      todaySales,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.vendor.count({ where: { companyId, isActive: true } }),
      prisma.payout.aggregate({
        where: { companyId, status: "completed" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payout.aggregate({
        where: { companyId, status: "pending" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.invoice.findMany({
        where: { companyId },
        include: {
          vendor: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.activity.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true } },
        },
      }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: { companyId },
        _count: true,
        _sum: { totalAmount: true },
      }),
      // Today's sales
      prisma.sale.findMany({
        where: {
          companyId,
          date: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    // Calculate today's sales breakdown
    const salesBreakdown: Record<string, number> = {
      cash: 0, upi: 0, card: 0, swiggy: 0, zomato: 0, other: 0,
    };
    let todaySalesTotal = 0;
    for (const sale of todaySales) {
      salesBreakdown[sale.paymentMethod] = (salesBreakdown[sale.paymentMethod] || 0) + sale.amount;
      todaySalesTotal += sale.amount;
    }

    return NextResponse.json({
      stats: {
        totalInvoiceAmount: totalInvoices._sum.totalAmount || 0,
        totalInvoiceCount: totalInvoices._count,
        activeVendors: totalVendors,
        completedPayouts: totalPayouts._sum.amount || 0,
        completedPayoutCount: totalPayouts._count,
        pendingPayoutAmount: pendingPayouts._sum.amount || 0,
        pendingPayoutCount: pendingPayouts._count,
        todaySalesTotal,
        todaySalesCount: todaySales.length,
      },
      todaySalesBreakdown: salesBreakdown,
      recentInvoices,
      recentActivity,
      invoicesByStatus,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
