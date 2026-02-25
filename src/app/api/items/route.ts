export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { itemSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.item.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { name: "asc" },
      include: {
        stockEntries: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Calculate current stock for each item
    const itemsWithStock = items.map((item) => {
      let currentStock = 0;
      let totalValue = 0;
      for (const entry of item.stockEntries) {
        if (entry.type === "in") {
          currentStock += entry.quantity;
          totalValue += entry.totalValue;
        } else if (entry.type === "out") {
          currentStock -= entry.quantity;
          totalValue -= entry.totalValue;
        } else {
          currentStock = entry.quantity; // adjustment
          totalValue = entry.totalValue;
        }
      }
      return {
        ...item,
        currentStock: Math.max(0, currentStock),
        totalValue: Math.max(0, totalValue),
        stockEntries: item.stockEntries.slice(0, 5), // only last 5
      };
    });

    return NextResponse.json(itemsWithStock);
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
    const validation = itemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const item = await prisma.item.create({
      data: {
        ...validation.data,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
