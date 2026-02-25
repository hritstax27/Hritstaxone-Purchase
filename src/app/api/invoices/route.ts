export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validations";
import { calculateInvoiceTotals } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = { companyId: session.user.companyId };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          items: {
            include: {
              category: { select: { id: true, name: true } },
              subcategory: { select: { id: true, name: true } },
            },
          },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
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
    const validation = invoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { invoiceNumber, invoiceDate, dueDate, vendorId, notes, items } =
      validation.data;

    const companyId = session.user.companyId;

    // Auto-create categories and subcategories from item data
    const processedItems = [];
    const categoryCache: Record<string, string> = {};
    const subcategoryCache: Record<string, string> = {};

    for (const item of items) {
      let categoryId = item.categoryId || null;
      let subcategoryId = item.subcategoryId || null;

      // Auto-resolve category by name if categoryName is provided
      const categoryName = (item.categoryName || "Other").trim();
      if (!categoryId && categoryName) {
        const cacheKey = categoryName.toLowerCase();
        if (categoryCache[cacheKey]) {
          categoryId = categoryCache[cacheKey];
        } else {
          // Find or create category
          let category = await prisma.category.findFirst({
            where: { name: { equals: categoryName }, companyId },
          });
          if (!category) {
            try {
              category = await prisma.category.create({
                data: { name: categoryName, companyId },
              });
            } catch (e: any) {
              // Handle unique constraint (race condition)
              if (e?.code === "P2002") {
                category = await prisma.category.findFirst({
                  where: { name: { equals: categoryName }, companyId },
                });
              }
            }
          }
          if (category) {
            categoryId = category.id;
            categoryCache[cacheKey] = category.id;
          }
        }
      }

      // Auto-create item description as subcategory under the category
      if (categoryId && item.description.trim()) {
        const subName = item.description.trim();
        const subCacheKey = `${categoryId}:${subName.toLowerCase()}`;
        if (subcategoryCache[subCacheKey]) {
          subcategoryId = subcategoryCache[subCacheKey];
        } else {
          let subcategory = await prisma.subcategory.findFirst({
            where: {
              name: { equals: subName },
              categoryId,
              companyId,
            },
          });
          if (!subcategory) {
            try {
              subcategory = await prisma.subcategory.create({
                data: { name: subName, categoryId, companyId },
              });
            } catch (e: any) {
              if (e?.code === "P2002") {
                subcategory = await prisma.subcategory.findFirst({
                  where: { name: { equals: subName }, categoryId, companyId },
                });
              }
            }
          }
          if (subcategory) {
            subcategoryId = subcategory.id;
            subcategoryCache[subCacheKey] = subcategory.id;
          }
        }
      }

      processedItems.push({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: item.unit || "pcs",
        gstRate: item.gstRate || 0,
        gstAmount: (item.quantity * item.unitPrice * (item.gstRate || 0)) / 100,
        totalAmount:
          item.quantity * item.unitPrice +
          (item.quantity * item.unitPrice * (item.gstRate || 0)) / 100,
        itemId: item.itemId || null,
        categoryId,
        subcategoryId,
      });
    }

    const totals = calculateInvoiceTotals(items);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        vendorId: vendorId || null,
        companyId,
        userId: session.user.id,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        notes,
        items: {
          create: processedItems,
        },
      },
      include: {
        items: {
          include: {
            category: true,
            subcategory: true,
          },
        },
        vendor: true,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "invoice_created",
        entityType: "invoice",
        entityId: invoice.id,
        details: `Invoice ${invoiceNumber} created`,
      },
    });

    // Create stock entries for each item
    for (const item of invoice.items) {
      if (item.itemId) {
        await prisma.stockEntry.create({
          data: {
            itemId: item.itemId,
            companyId,
            type: "in",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalValue: item.totalAmount,
            reference: invoiceNumber,
          },
        });
      }
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
