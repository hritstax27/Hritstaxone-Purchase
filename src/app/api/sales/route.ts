export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const saleSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["cash", "upi", "card", "swiggy", "zomato", "other"]),
  description: z.string().optional(),
  customerName: z.string().optional(),
  orderNumber: z.string().optional(),
  date: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const companyId = session.user.companyId;

    // If specific date, get that day's sales
    if (dateStr) {
      const dayStart = new Date(dateStr);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateStr);
      dayEnd.setHours(23, 59, 59, 999);

      const sales = await prisma.sale.findMany({
        where: {
          companyId,
          date: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { createdAt: "desc" },
      });

      // Aggregate by payment method
      const breakdown: Record<string, number> = {
        cash: 0,
        upi: 0,
        card: 0,
        swiggy: 0,
        zomato: 0,
        other: 0,
      };
      let total = 0;

      for (const sale of sales) {
        breakdown[sale.paymentMethod] = (breakdown[sale.paymentMethod] || 0) + sale.amount;
        total += sale.amount;
      }

      return NextResponse.json({ sales, breakdown, total, date: dateStr });
    }

    // Date range query
    const where: any = { companyId };
    if (from && to) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.date = { gte: fromDate, lte: toDate };
    }

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Calculate totals
    const breakdown: Record<string, number> = {
      cash: 0, upi: 0, card: 0, swiggy: 0, zomato: 0, other: 0,
    };
    let total = 0;
    for (const sale of sales) {
      breakdown[sale.paymentMethod] = (breakdown[sale.paymentMethod] || 0) + sale.amount;
      total += sale.amount;
    }

    return NextResponse.json({ sales, breakdown, total });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = saleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { amount, paymentMethod, description, customerName, orderNumber, date } =
      validation.data;

    const sale = await prisma.sale.create({
      data: {
        amount,
        paymentMethod,
        description,
        customerName,
        orderNumber,
        date: date ? new Date(date) : new Date(),
        companyId: session.user.companyId,
        userId: session.user.id,
      },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "sale_recorded",
        entityType: "sale",
        entityId: sale.id,
        details: `Sale of ₹${amount} via ${paymentMethod} recorded`,
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
