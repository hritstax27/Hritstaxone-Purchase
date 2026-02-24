import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    const subcategories = await prisma.subcategory.findMany({
      where: { companyId },
      select: { name: true },
    });

    const result: Record<string, { price: number; date: string; lowestPrice?: number; lowestVendor?: string; lowestDate?: string }> = {};

    for (const sub of subcategories) {
      const latestItem = await prisma.invoiceItem.findFirst({
        where: {
          description: { equals: sub.name },
          invoice: { companyId },
        },
        orderBy: { createdAt: "desc" },
        select: {
          unitPrice: true,
          invoice: {
            select: {
              invoiceDate: true,
              vendor: { select: { name: true } },
            },
          },
        },
      });

      if (latestItem) {
        const lowestItem = await prisma.invoiceItem.findFirst({
          where: {
            description: { equals: sub.name },
            invoice: { companyId },
            unitPrice: { gt: 0 },
          },
          orderBy: { unitPrice: "asc" },
          select: {
            unitPrice: true,
            invoice: {
              select: {
                invoiceDate: true,
                vendor: { select: { name: true } },
              },
            },
          },
        });

        result[sub.name] = {
          price: latestItem.unitPrice,
          date: latestItem.invoice.invoiceDate.toISOString(),
          lowestPrice: lowestItem?.unitPrice,
          lowestVendor: lowestItem?.invoice.vendor?.name || undefined,
          lowestDate: lowestItem?.invoice.invoiceDate?.toISOString() || undefined,
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching category prices:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
