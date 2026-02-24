import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await req.json();
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Items required" }, { status: 400 });
    }

    const companyId = session.user.companyId;
    const changes: any[] = [];

    for (const item of items) {
      const { description, unitPrice } = item;
      if (!description || unitPrice === undefined) continue;

      const lastItem = await prisma.invoiceItem.findFirst({
        where: {
          description: { equals: description },
          invoice: { companyId },
        },
        orderBy: { createdAt: "desc" },
        include: {
          invoice: {
            select: {
              invoiceDate: true,
              vendor: { select: { name: true } },
            },
          },
        },
      });

      if (lastItem && Math.abs(lastItem.unitPrice - unitPrice) > 0.01) {
        const change = unitPrice - lastItem.unitPrice;
        const changePercent = lastItem.unitPrice > 0
          ? (change / lastItem.unitPrice) * 100
          : 0;

        changes.push({
          itemName: description,
          oldPrice: lastItem.unitPrice,
          newPrice: unitPrice,
          lastDate: lastItem.invoice.invoiceDate,
          lastVendor: lastItem.invoice.vendor?.name || "—",
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
        });
      }
    }

    return NextResponse.json({ changes });
  } catch (error) {
    console.error("Price check error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
