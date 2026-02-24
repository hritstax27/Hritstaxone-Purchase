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
    const vendorId = searchParams.get("vendorId");

    if (!vendorId) {
      return NextResponse.json({ error: "vendorId required" }, { status: 400 });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        vendorId,
        companyId: session.user.companyId,
        status: { notIn: ["paid"] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        totalAmount: true,
        status: true,
      },
      orderBy: { invoiceDate: "desc" },
    });

    const payouts = await prisma.payout.findMany({
      where: {
        vendorId,
        companyId: session.user.companyId,
        status: { in: ["pending", "completed", "processing"] },
      },
      select: {
        amount: true,
        notes: true,
      },
    });

    const paidPerInvoice: Record<string, number> = {};
    for (const payout of payouts) {
      if (!payout.notes) continue;
      const invoiceMatch = payout.notes.match(/Invoices:\s*(.+)/);
      if (!invoiceMatch) continue;
      const parts = invoiceMatch[1].split(",").map((s) => s.trim());
      for (const part of parts) {
        const match = part.match(/^(.+?):\s*₹?([\d.]+)/);
        if (match) {
          const invNum = match[1].trim();
          const amt = parseFloat(match[2]) || 0;
          const inv = invoices.find((i) => i.invoiceNumber === invNum);
          if (inv) {
            paidPerInvoice[inv.id] = (paidPerInvoice[inv.id] || 0) + amt;
          }
        }
      }
    }

    const result = invoices.map((inv) => {
      const paid = paidPerInvoice[inv.id] || 0;
      const outstanding = Math.max(0, Math.round((inv.totalAmount - paid) * 100) / 100);
      return {
        ...inv,
        paidAmount: paid,
        outstandingAmount: outstanding,
      };
    }).filter((inv) => inv.outstandingAmount > 0);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching vendor invoices:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
