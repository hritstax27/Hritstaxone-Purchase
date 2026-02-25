export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { payoutSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = { companyId: session.user.companyId };
    if (status) where.status = status;
    if (category) where.category = category;

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payout.count({ where }),
    ]);

    return NextResponse.json({
      payouts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
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
    const validation = payoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { vendorId, amount, paymentMethod, paymentRef, notes, category } =
      validation.data;

    const invoiceAllocations = body.invoiceAllocations as { invoiceId: string; amount: number }[] | undefined;

    // Verify vendor belongs to company
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, companyId: session.user.companyId },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Build notes with invoice references
    let payoutNotes = notes || "";
    if (invoiceAllocations && invoiceAllocations.length > 0) {
      const invoiceIds = invoiceAllocations.map((a) => a.invoiceId);
      const invoices = await prisma.invoice.findMany({
        where: { id: { in: invoiceIds } },
        select: { id: true, invoiceNumber: true },
      });
      const invoiceMap: Record<string, string> = {};
      for (const inv of invoices) invoiceMap[inv.id] = inv.invoiceNumber;

      const allocDetails = invoiceAllocations
        .map((a) => `${invoiceMap[a.invoiceId] || a.invoiceId}: ₹${a.amount}`)
        .join(", ");
      payoutNotes = payoutNotes
        ? `${payoutNotes} | Invoices: ${allocDetails}`
        : `Invoices: ${allocDetails}`;
    }

    const payout = await prisma.payout.create({
      data: {
        vendorId,
        companyId: session.user.companyId,
        userId: session.user.id,
        amount,
        paymentMethod,
        paymentRef,
        notes: payoutNotes,
        category,
        status: "pending",
      },
      include: { vendor: true },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "payout_created",
        entityType: "payout",
        entityId: payout.id,
        details: `Payout of ₹${amount} to ${vendor.name}`,
      },
    });

    return NextResponse.json(payout, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
