export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        vendor: true,
        items: {
          include: {
            item: true,
            category: { select: { id: true, name: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
        user: { select: { name: true, email: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

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

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.vendorId !== undefined) updateData.vendorId = body.vendorId || null;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.invoiceNumber !== undefined) updateData.invoiceNumber = body.invoiceNumber;
    if (body.invoiceDate !== undefined) updateData.invoiceDate = new Date(body.invoiceDate);
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.tallyPushed !== undefined) {
      updateData.tallyPushed = body.tallyPushed;
      updateData.tallyPushedAt = body.tallyPushed ? new Date() : undefined;
    }

    if (body.items && Array.isArray(body.items)) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: params.id } });

      let subtotal = 0;
      let taxAmount = 0;
      for (const item of body.items) {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const gst = Number(item.gstRate) || 0;
        const lineSubtotal = qty * price;
        const lineGst = (lineSubtotal * gst) / 100;
        subtotal += lineSubtotal;
        taxAmount += lineGst;

        await prisma.invoiceItem.create({
          data: {
            invoiceId: params.id,
            description: item.description || "",
            quantity: qty,
            unitPrice: price,
            unit: item.unit || "pcs",
            gstRate: gst,
            gstAmount: Math.round(lineGst * 100) / 100,
            totalAmount: Math.round((lineSubtotal + lineGst) * 100) / 100,
            categoryId: item.categoryId || null,
            subcategoryId: item.subcategoryId || null,
          },
        });
      }
      updateData.subtotal = Math.round(subtotal * 100) / 100;
      updateData.taxAmount = Math.round(taxAmount * 100) / 100;
      updateData.totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: { vendor: true, items: true },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: body.status ? `invoice_${body.status}` : "invoice_updated",
        entityType: "invoice",
        entityId: updated.id,
        details: `Invoice ${updated.invoiceNumber} updated${body.status ? ` to ${body.status}` : ""}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await prisma.invoice.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Invoice deleted" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
