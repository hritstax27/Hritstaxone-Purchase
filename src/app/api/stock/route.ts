import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { stockEntrySchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = { companyId: session.user.companyId };
    if (itemId) where.itemId = itemId;

    const [entries, total] = await Promise.all([
      prisma.stockEntry.findMany({
        where,
        include: {
          item: { select: { name: true, unit: true, sku: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
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
    const validation = stockEntrySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { itemId, type, quantity, unitPrice, reference, notes } = validation.data;

    // Verify item belongs to company
    const item = await prisma.item.findFirst({
      where: { id: itemId, companyId: session.user.companyId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const entry = await prisma.stockEntry.create({
      data: {
        itemId,
        companyId: session.user.companyId,
        type,
        quantity,
        unitPrice,
        totalValue: quantity * unitPrice,
        reference,
        notes,
      },
      include: { item: true },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
