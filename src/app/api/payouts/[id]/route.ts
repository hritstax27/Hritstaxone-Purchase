export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const payout = await prisma.payout.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });

    if (!payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    const updated = await prisma.payout.update({
      where: { id: params.id },
      data: {
        status: body.status,
        paymentDate: body.status === "completed" ? new Date() : undefined,
        paymentRef: body.paymentRef || payout.paymentRef,
      },
      include: { vendor: true },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: `payout_${body.status}`,
        entityType: "payout",
        entityId: updated.id,
        details: `Payout to ${updated.vendor.name} marked as ${body.status}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
