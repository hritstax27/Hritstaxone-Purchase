import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateTallyXML } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { invoiceIds } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "No invoices selected" },
        { status: 400 }
      );
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        companyId: session.user.companyId,
      },
      include: {
        vendor: true,
        items: { include: { item: true } },
      },
    });

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: "No matching invoices found" },
        { status: 404 }
      );
    }

    // Generate XML for each invoice
    const xmlExports = invoices.map((invoice) => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      xml: generateTallyXML(invoice),
    }));

    // Mark invoices as pushed to Tally
    await prisma.invoice.updateMany({
      where: { id: { in: invoiceIds } },
      data: {
        tallyPushed: true,
        tallyPushedAt: new Date(),
        status: "pushed_to_tally",
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "tally_export",
        entityType: "invoice",
        details: `Exported ${invoices.length} invoice(s) to Tally`,
      },
    });

    return NextResponse.json({
      message: `${invoices.length} invoice(s) exported to Tally format`,
      exports: xmlExports,
    });
  } catch (error) {
    console.error("Tally export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
